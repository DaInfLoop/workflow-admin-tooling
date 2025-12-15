import type { AllMiddlewareArgs, SlackViewAction, SlackViewMiddlewareArgs, StringIndexed } from "@slack/bolt";
import { userTokenApiCall } from "../../utils";
import sql from "../../postgres";

import rulesets from "../../rulesets";
import type { AdminWorkflowsSearchResponse } from "@slack/web-api";

export default async function WorkflowManagement(ctx: SlackViewMiddlewareArgs<SlackViewAction> & AllMiddlewareArgs<StringIndexed>) {
    const data: {
        action: 'unpublish' | 'publish' | 'delete',
        workflowName: string,
        workflowId: string
    } = JSON.parse(ctx.view.private_metadata)

    const workflows: AdminWorkflowsSearchResponse | { ok: false, error: string } = await userTokenApiCall('admin.workflows.search', {
        query: data.workflowName,
        publish_status: 'all',
        collaborator_ids: [ctx.body.user.id]
    }).catch(err => ({
        ok: false,
        error: err.toString()
    }));

    if (!workflows.ok) {
        console.error(workflows.error)

        return await ctx.ack({
            response_action: 'update',
            view: {
                type: 'modal',
                private_metadata: ctx.view.private_metadata,
                callback_id: 'manage-workflow',
                title: {
                    type: 'plain_text',
                    text: 'Confirmation'
                },
                submit: ctx.view.submit!,
                close: {
                    type: 'plain_text',
                    text: 'Never mind'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:neobot_error: There was a problem trying to fetch the data for *${data.workflowName}*... try again later?`
                        }
                    }
                ]
            }
        })
    }

    console.error(workflows)

    const workflow = workflows.workflows!.find(workflow => workflow.id === data.workflowId);

    if (!workflow) {
        console.error('oops..')
        return await ctx.ack({
            response_action: 'update',
            view: {
                type: 'modal',
                private_metadata: ctx.view.private_metadata,
                callback_id: 'manage-workflow',
                title: {
                    type: 'plain_text',
                    text: 'Confirmation'
                },
                submit: ctx.view.submit!,
                close: {
                    type: 'plain_text',
                    text: 'Never mind'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:neobot_error: There was a problem trying to fetch the data for *${data.workflowName}*... try again later?`
                        }
                    }
                ]
            }
        })
    }

    if (!workflow.collaborators!.includes(process.env.ADMIN_USER_ID)) {
        await userTokenApiCall('admin.workflows.collaborators.add', {
            workflow_ids: [workflow.id],
            collaborator_ids: [process.env.ADMIN_USER_ID]
        })
    }

    await sql`INSERT INTO workflows ${sql({
        id: data.workflowId
    })} ON CONFLICT (id) DO NOTHING`;

    switch (data.action) {
        case 'publish':
            sql`INSERT INTO audit ${sql({
                workflow_id: data.workflowId,
                actor: ctx.body.user.id,
                action: 'publish',
                reason: 'Workflow was requested to be published via App Home'
            })}`.execute();

            const denyPublish = rulesets.filter(ruleset => ruleset.run(workflow as any));

            if (denyPublish.length) {
                const toRemove = workflow.collaborators!.filter(collaborator => collaborator !== process.env.ADMIN_USER_ID);

                await sql.begin(async sql => {
                    await sql`INSERT INTO review_queue ${sql({
                        workflow_id: data.workflowId,
                        collaborators: toRemove.join(',')
                    })}`

                    await sql`INSERT INTO audit ${sql({
                        workflow_id: data.workflowId,
                        actor: process.env.ADMIN_USER_ID,
                        action: 'flag',
                        reason: `Workflow was automatically flagged for review (${denyPublish.map(ruleset => `"${ruleset.name}"`).join(', ')
                            })`
                    })}`;
                })

                const userElements = toRemove.flatMap((uid: string, i: number, arr: string[]) => {
                    const elems: (
                        { type: 'user', user_id: string } |
                        { type: 'text', text: string }
                    )[] = [{ type: 'user', user_id: uid }];

                    if (i < arr.length - 1) {
                        elems.push({ type: 'text', text: ', ' });
                    }

                    return elems;
                });

                await userTokenApiCall('admin.workflows.collaborators.remove', {
                    workflow_ids: [workflow.id],
                    collaborator_ids: toRemove
                })

                await ctx.client.chat.postMessage({
                    channel: process.env.ADMIN_REVIEW_CHANNEL,
                    text: `<!subteam^${process.env.ADMIN_USERGROUP_ID}>`,
                    blocks: [
                        {
                            type: 'rich_text',
                            elements: [
                                {
                                    type: 'rich_text_section',
                                    elements: [
                                        {
                                            type: 'usergroup',
                                            usergroup_id: process.env.ADMIN_USERGROUP_ID
                                        }
                                    ]
                                },
                                {
                                    type: 'rich_text_quote',
                                    border: 1,
                                    elements: [
                                        {
                                            type: 'link',
                                            text: data.workflowName,
                                            url: `https://slack.com/shortcuts/${workflow.trigger_ids![0]}`,
                                            style: {
                                                bold: true
                                            }
                                        },
                                        {
                                            type: 'text',
                                            text: ' (by '
                                        },
                                        ...userElements,
                                        {
                                            type: 'text',
                                            text: ') got flagged for manual review.'
                                        }
                                    ],
                                },
                                {
                                    type: 'rich_text_section',
                                    elements: [
                                        {
                                            type: 'emoji',
                                            name: 'information_source',
                                            unicode: '2139'
                                        },
                                        {
                                            type: 'text',
                                            text: ' Why was this workflow flagged?',
                                            style: {
                                                bold: true
                                            }
                                        }
                                    ]
                                },
                                {
                                    type: 'rich_text_list',
                                    style: 'bullet',
                                    elements: denyPublish.map(ruleset => ({
                                        type: 'rich_text_section',
                                        elements: [
                                            {
                                                type: 'text',
                                                text: ruleset.name
                                            }
                                        ]
                                    })),
                                }
                            ]
                        },
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    action_id: 'review-workflow',
                                    text: {
                                        type: 'plain_text',
                                        text: 'Review workflow'
                                    },
                                    style: undefined,
                                    value: data.workflowId
                                },
                                {
                                    type: 'button',
                                    action_id: 'wrt-publish',
                                    text: {
                                        type: 'plain_text',
                                        text: 'Approve'
                                    },
                                    confirm: {
                                        title: {
                                            type: 'plain_text',
                                            text: 'Are you sure?'
                                        },
                                        text: {
                                            type: 'mrkdwn',
                                            text: `By approving *${data.workflowName}*, it will be published immediately, any WRT members will be removed from the workflow, and all the previous collaborators will be re-added. Are you sure?`
                                        },
                                        confirm: {
                                            type: 'plain_text',
                                            text: 'Approve'
                                        },
                                        deny: {
                                            type: 'plain_text',
                                            text: 'Never mind'
                                        },
                                        style: 'primary'
                                    },
                                    style: 'primary',
                                    value: data.workflowId
                                },
                                {
                                    type: 'button',
                                    action_id: 'wrt-deny',
                                    text: {
                                        type: 'plain_text',
                                        text: 'Deny'
                                    },
                                    // Confirmation is done in a view in order to allow an optional reason to be given alongside the rejection
                                    style: 'danger',
                                    value: data.workflowId
                                }
                            ]
                        }
                    ]
                })

                await ctx.client.chat.postMessage({
                    channel: ctx.body.user.id,
                    text: `Hey there! You just tried to publish *${data.workflowName}*.\n\nUnfortunately, it's been flagged for manual review. You've been removed as a workflow collaborator until the workflow has been reviewed.`,
                    blocks: [
                        {
                            type: 'rich_text',
                            elements: [
                                {
                                    type: 'rich_text_section',
                                    elements: [
                                        {
                                            type: 'text',
                                            text: 'Hey there! You just tried to publish '
                                        },
                                        {
                                            type: 'text',
                                            text: data.workflowName,
                                            style: {
                                                bold: true
                                            }
                                        },
                                        {
                                            type: 'text',
                                            text: '.\n\nUnfortunately, it\'s been flagged for manual review. You\'ve been removed as a workflow collaborator until the workflow has been reviewed.'
                                        }
                                    ]
                                },
                                {
                                    type: 'rich_text_section',
                                    elements: [
                                        {
                                            type: 'emoji',
                                            name: 'information_source',
                                            unicode: '2139'
                                        },
                                        {
                                            type: 'text',
                                            text: ' Why was my workflow flagged?',
                                            style: {
                                                bold: true
                                            }
                                        },
                                        {
                                            type: 'text',
                                            text: '\nYour workflow was flagged because it failed to pass the following rulesets:'
                                        }
                                    ]
                                },
                                {
                                    type: 'rich_text_list',
                                    style: 'bullet',
                                    elements: denyPublish.map(ruleset => ({
                                        type: 'rich_text_section',
                                        elements: [
                                            {
                                                type: 'text',
                                                text: ruleset.name
                                            }
                                        ]
                                    })),
                                }
                            ]
                        }
                    ]
                })

                for (const collaborator of toRemove.filter(collaborator => collaborator !== ctx.body.user.id)) {
                    await ctx.client.chat.postMessage({
                        channel: collaborator,
                        text: `Hey there! <@${ctx.body.user.id}> just tried to publish *${data.workflowName}*, which you're a collaborator on.\n\nUnfortunately, it's been flagged for manual review. You've been removed as a workflow collaborator until the workflow has been reviewed.`
                    })
                }

                return await ctx.ack({ response_action: 'clear' });
            }

            const publishRes = await userTokenApiCall('functions.workflows.publish', {
                workflow_id: data.workflowId
            })

            console.error(publishRes)

            if (!publishRes.ok) {
                return await ctx.ack({
                    response_action: 'update',
                    view: {
                        type: 'modal',
                        private_metadata: ctx.view.private_metadata,
                        callback_id: 'manage-workflow',
                        title: {
                            type: 'plain_text',
                            text: 'Confirmation'
                        },
                        submit: ctx.view.submit!,
                        close: {
                            type: 'plain_text',
                            text: 'Never mind'
                        },
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `:neobot_error: There was a problem trying to publish *${data.workflowName}*!`
                                }
                            },
                            {
                                type: 'rich_text',
                                elements: [
                                    {
                                        type: 'rich_text_preformatted',
                                        elements: [
                                            {
                                                type: 'text',
                                                text: JSON.stringify({
                                                    ok: false,
                                                    error: publishRes.error
                                                }, null, 2)
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                })
            }

            const inputParams: Record<string, { value: string }> = {};

            for (const input of Object.values(publishRes.decorated_workflow.input_parameters as Record<string, any>)) {
                // hopefully this works??????
                inputParams[input.name] = { value: `{{data.${input.type.split('/').pop()}}}` }
            }

            const triggerUpdateRes = await (() => {
                // @ts-ignore it does exist :p
                switch (workflow.trigger_types![0].type) {
                    case 'shortcut':
                        return userTokenApiCall('workflows.triggers.update', {
                            type: 'shortcut',
                            trigger_id: workflow.trigger_ids![0],
                            inputs: inputParams,
                            workflow: data.workflowId,
                            name: data.workflowName,
                            description: workflow.description
                        })

                    case 'webhook':
                        // Webhooks are filtered above, so we don't need to do anything about this
                        return { ok: false, error: 'Through App Home publishing, you should not be able to publish webhook trigger workflows. Please report this in #workflow-review-meta!' };

                    case 'schedule':
                        // Through testing, apparently scheduled workflows don't need to have their triggers updated.
                        return { ok: true };

                    case 'event':
                        // This would require vigorous testing, because I'm VERY sure this should need a trigger update. Not too sure though.
                        return { ok: true };
                }
            })();

            if (!triggerUpdateRes.ok) {
                userTokenApiCall('functions.workflows.unpublish', {
                    workflow_id: data.workflowId
                });

                sql`INSERT INTO audit ${sql({
                    workflow_id: data.workflowId,
                    actor: process.env.ADMIN_USER_ID,
                    action: 'unpublish',
                    reason: '[Automatic] There was an error while trying to publish the workflow trigger'
                })}`.execute();

                return await ctx.ack({
                    response_action: 'update',
                    view: {
                        type: 'modal',
                        private_metadata: ctx.view.private_metadata,
                        callback_id: 'manage-workflow',
                        title: {
                            type: 'plain_text',
                            text: 'Confirmation'
                        },
                        submit: ctx.view.submit!,
                        close: {
                            type: 'plain_text',
                            text: 'Never mind'
                        },
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `:neobot_error: There was a problem trying to publish *${data.workflowName}*!`
                                }
                            },
                            {
                                type: 'rich_text',
                                elements: [
                                    {
                                        type: 'rich_text_preformatted',
                                        elements: [
                                            {
                                                type: 'text',
                                                text: JSON.stringify({
                                                    ok: false,
                                                    error: triggerUpdateRes.error
                                                }, null, 2)
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                })
            }

            await ctx.ack({ response_action: 'clear' });

            await ctx.client.chat.postMessage({
                channel: ctx.body.user.id,
                text: `*${data.workflowName}* was published successfully!\n\n${triggerUpdateRes.trigger.type == "shortcut" ? "The link to start it is: " : "A shareable link to view the workflow details is: "}${triggerUpdateRes.trigger.share_url}`,
            })

            for (const collaborator of workflow.collaborators!.filter(collaborator =>
                collaborator !== ctx.body.user.id &&
                collaborator !== process.env.ADMIN_USER_ID
            )) {
                await ctx.client.chat.postMessage({
                    channel: collaborator,
                    text: `Hey there! <@${ctx.body.user.id}> just published *${data.workflowName}*, which you're a collaborator on.\n\n${triggerUpdateRes.trigger.type == "shortcut" ? "The link to start it is: " : "A shareable link to view the workflow details is: "}${triggerUpdateRes.trigger.share_url}`,
                })
            }
            break;

        case 'unpublish':
            sql`INSERT INTO audit ${sql({
                workflow_id: data.workflowId,
                actor: ctx.body.user.id,
                action: 'unpublish',
                reason: 'Workflow was requested to be unpublished via App Home'
            })}`.execute();

            const unpublishRes = await userTokenApiCall('functions.workflows.unpublish', {
                workflow_id: data.workflowId
            });

            if (!unpublishRes.ok) {
                return await ctx.ack({
                    response_action: 'update',
                    view: {
                        type: 'modal',
                        private_metadata: ctx.view.private_metadata,
                        callback_id: 'manage-workflow',
                        title: {
                            type: 'plain_text',
                            text: 'Confirmation'
                        },
                        submit: ctx.view.submit!,
                        close: {
                            type: 'plain_text',
                            text: 'Never mind'
                        },
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `:neobot_error: There was a problem trying to unpublish *${data.workflowName}*!`
                                }
                            },
                            {
                                type: 'rich_text',
                                elements: [
                                    {
                                        type: 'rich_text_preformatted',
                                        elements: [
                                            {
                                                type: 'text',
                                                text: JSON.stringify({
                                                    ok: false,
                                                    error: unpublishRes.error
                                                }, null, 2)
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                })
            }

            await ctx.ack({ response_action: 'clear' });

            await ctx.client.chat.postMessage({
                channel: ctx.body.user.id,
                text: `*${data.workflowName}* was unpublished successfully. It will no longer work until someone publishes it again.`,
            })

            for (const collaborator of workflow.collaborators!.filter(collaborator =>
                collaborator !== ctx.body.user.id &&
                collaborator !== process.env.ADMIN_USER_ID
            )) {
                await ctx.client.chat.postMessage({
                    channel: collaborator,
                    text: `Hey there! <@${ctx.body.user.id}> just unpublished *${data.workflowName}*, which you're a collaborator on. It will no longer work until someone publishes it again.`,
                })
            }
            break;

        case 'delete':
            sql`INSERT INTO audit ${sql({
                workflow_id: data.workflowId,
                actor: ctx.body.user.id,
                action: 'delete',
                reason: 'Workflow was requested to be deleted via App Home'
            })}`.execute();

            const deleteRes = await userTokenApiCall('functions.workflows.delete', {
                workflow_id: data.workflowId
            });

            if (!unpublishRes.ok) {
                return await ctx.ack({
                    response_action: 'update',
                    view: {
                        type: 'modal',
                        private_metadata: ctx.view.private_metadata,
                        callback_id: 'manage-workflow',
                        title: {
                            type: 'plain_text',
                            text: 'Confirmation'
                        },
                        submit: ctx.view.submit!,
                        close: {
                            type: 'plain_text',
                            text: 'Never mind'
                        },
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `:neobot_error: There was a problem trying to delete *${data.workflowName}*!`
                                }
                            },
                            {
                                type: 'rich_text',
                                elements: [
                                    {
                                        type: 'rich_text_preformatted',
                                        elements: [
                                            {
                                                type: 'text',
                                                text: JSON.stringify({
                                                    ok: false,
                                                    error: deleteRes.error
                                                }, null, 2)
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                })
            }

            await ctx.ack({ response_action: 'clear' });

            await ctx.client.chat.postMessage({
                channel: ctx.body.user.id,
                text: `*${data.workflowName}* was deleted successfully. It no longer exists, and cannot be published or edited.`,
            })

            for (const collaborator of workflow.collaborators!.filter(collaborator =>
                collaborator !== ctx.body.user.id &&
                collaborator !== process.env.ADMIN_USER_ID
            )) {
                await ctx.client.chat.postMessage({
                    channel: collaborator,
                    text: `Hey there! <@${ctx.body.user.id}> just deleted *${data.workflowName}*, which were a collaborator on. It no longer exists, and cannot be published or edited.`,
                })
            }            
    }
}