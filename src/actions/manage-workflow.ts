import type { AllMiddlewareArgs, BlockOverflowAction, SlackActionMiddlewareArgs, StringIndexed } from "@slack/bolt";

export default async function WorkflowManagement(ctx: SlackActionMiddlewareArgs<BlockOverflowAction> & AllMiddlewareArgs<StringIndexed>) {
    const data: {
        action: 'unpublish' | 'publish' | 'delete',
        workflowName: string,
        workflowId: string
    } = JSON.parse(ctx.action.selected_option.value)

    await ctx.ack();

    switch (data.action) {
        case 'unpublish':
            ctx.client.views.open({
                trigger_id: ctx.body.trigger_id,
                view: {
                    type: 'modal',
                    private_metadata: ctx.action.selected_option.value,
                    callback_id: 'manage-workflow',
                    title: {
                        type: 'plain_text',
                        text: 'Confirmation'
                    },
                    submit: {
                        type: 'plain_text',
                        text: 'Unpublish'
                    },
                    close: {
                        type: 'plain_text',
                        text: 'Never mind'
                    },
                    blocks: [
                        {
                            type: 'section',
                            block_id: 'confirm',
                            text: {
                                type: 'mrkdwn',
                                text: `Are you sure you want to unpublish *${data.workflowName}*? It'll stop working until you re-publish it.`
                            }
                        }
                    ]
                }
            })
            break;

        case 'publish':
            ctx.client.views.open({
                trigger_id: ctx.body.trigger_id,
                view: {
                    type: 'modal',
                    private_metadata: ctx.action.selected_option.value,
                    callback_id: 'manage-workflow',
                    title: {
                        type: 'plain_text',
                        text: 'Confirmation'
                    },
                    submit: {
                        type: 'plain_text',
                        text: 'Publish'
                    },
                    close: {
                        type: 'plain_text',
                        text: 'Never mind'
                    },
                    blocks: [
                        {
                            type: 'section',
                            block_id: 'confirm',
                            text: {
                                type: 'mrkdwn',
                                text: `Are you sure you want to publish *${data.workflowName}*?`
                            }
                        }
                    ]
                }
            })
            break;

        case 'delete':
            ctx.client.views.open({
                trigger_id: ctx.body.trigger_id,
                view: {
                    type: 'modal',
                    private_metadata: ctx.action.selected_option.value,
                    callback_id: 'manage-workflow',
                    title: {
                        type: 'plain_text',
                        text: 'Confirmation'
                    },
                    submit: {
                        type: 'plain_text',
                        text: 'Delete'
                    },
                    close: {
                        type: 'plain_text',
                        text: 'Never mind'
                    },
                    blocks: [
                        {
                            type: 'section',
                            block_id: 'confirm',
                            text: {
                                type: 'mrkdwn',
                                text: `Are you sure you want to delete *${data.workflowName}*? This is irreversable, and you can't go back!`
                            }
                        }
                    ]
                }
            })
            break;
    }
}