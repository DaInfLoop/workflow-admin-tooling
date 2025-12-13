import type { AdminWorkflowsSearchResponse, Workflow } from "@slack/web-api/dist/types/response/AdminWorkflowsSearchResponse";
import type { AllMiddlewareArgs, SlackEventMiddlewareArgs, StringIndexed } from "@slack/bolt";
import type { HomeView, PlainTextOption, SectionBlock } from "@slack/web-api";
import { userTokenApiCall } from "../../utils";

export async function generateAppHome(userId: string, {
    filters = {
        search: undefined,
        publish_state: undefined
    },
    sort = "desc"
}: {
    filters?: {
        search?: string,
        publish_state: 'published' | 'unpublished' | undefined
    },
    sort?: "asc" | "desc"
}): Promise<HomeView> {
    const workflows: AdminWorkflowsSearchResponse | { ok: false, error: string } = await userTokenApiCall('admin.workflows.search', {
        collaborator_ids: [userId],
        query: filters.search
    }).catch(err => ({
        ok: false,
        error: err.toString()
    }));

    if (!workflows.ok) {
        return {
            type: "home",
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "Manage your workflows",
                        emoji: true
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Create a new workflow",
                                emoji: true
                            },
                            style: "primary",
                            action_id: "create-workflow"
                        }
                    ]
                },
                {
                    type: "divider"
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `:neobot_error: There was an error trying to fetch the workflows you manage...`
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
                                        error: workflows.error
                                    }, null, 2)
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }

    const sortedWorkflows = workflows.workflows!.sort((a, b) => {
        const dateA = new Date(a.date_updated!).getTime();
        const dateB = new Date(b.date_updated!).getTime();

        return sort === "asc" ? dateA - dateB : dateB - dateA;
    })

    const workflowBlocks: SectionBlock[] = [];

    for (const workflow of workflows.workflows!) {
        if (filters?.publish_state && (
            (filters.publish_state == "published" && !workflow.is_published) ||
            (filters.publish_state == "unpublished" && workflow.is_published)
        )) continue;

        workflowBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*<https://slack.com/shortcuts/${workflow.trigger_ids![0]}|${workflow.title}>*\n${workflow.description}`
            },
            accessory: {
                type: "overflow",
                options: [
                    ...(workflow.is_published ?
                        [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Unpublish workflow",
                                    emoji: true
                                },
                                value: JSON.stringify({
                                    action: "unpublish",
                                    workflowId: workflow.id
                                })
                            }
                        ] as PlainTextOption[] :
                        [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Publish workflow",
                                    emoji: true
                                },
                                value: JSON.stringify({
                                    action: "publish",
                                    workflowId: workflow.id
                                })
                            }
                        ] as PlainTextOption[]
                    ),
                    {
                        text: {
                            type: "plain_text",
                            text: ":warning: Delete workflow",
                            emoji: true
                        },
                        value: JSON.stringify({
                            action: "delete",
                            workflowId: workflow.id
                        })
                    }
                ],
                action_id: "manage-workflow"
            }
        })
    }

    return {
        type: "home",
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "Manage your workflows",
                    emoji: true
                }
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Create a new workflow",
                            emoji: true
                        },
                        style: "primary",
                        action_id: "create-workflow"
                    }
                ]
            },
            {
                type: "divider"
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "static_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Choose a filter...",
                            emoji: true
                        },
                        initial_option: (() => {
                            switch (filters.publish_state) {
                                case undefined:
                                    return {
                                        text: {
                                            type: "plain_text",
                                            text: "No filter",
                                            emoji: true
                                        },
                                        value: "no-filter"
                                    }

                                case 'published':
                                    return {
                                        text: {
                                            type: "plain_text",
                                            text: "Published",
                                            emoji: true
                                        },
                                        value: "published"
                                    }

                                case 'unpublished':
                                    return {
                                        text: {
                                            type: "plain_text",
                                            text: "Unpublished",
                                            emoji: true
                                        },
                                        value: "unpublished"
                                    }
                            }
                        })(),
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "No filter",
                                    emoji: true
                                },
                                value: "no-filter"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Published",
                                    emoji: true
                                },
                                value: "published"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Unpublished",
                                    emoji: true
                                },
                                value: "unpublished"
                            }
                        ],
                        action_id: "filters"
                    },
                    {
                        type: "static_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Sort by...",
                            emoji: true
                        },
                        initial_option: {
                            text: {
                                type: "plain_text",
                                text: `${sort == "desc" ? 'Most' : 'Least'} recently edited`,
                                emoji: true
                            },
                            value: sort
                        },
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Most recently edited",
                                    emoji: true
                                },
                                value: "desc"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Least recently edited",
                                    emoji: true
                                },
                                value: "asc"
                            }
                        ],
                        action_id: "sort"
                    }
                ]
            },
            {
                dispatch_action: true,
                type: "input",
                element: {
                    type: "plain_text_input",
                    action_id: "search",
                    initial_value: filters.search
                },
                label: {
                    type: "plain_text",
                    text: "Search query",
                    emoji: true
                },
                optional: true
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Showing ${workflowBlocks.length} results`
                    }
                ]
            },
            {
                type: "divider"
            },
            ...workflowBlocks
        ]
    }
}

// For proper type-checking + intellisense, replace "event_template" with the raw event name
export default async function AppHomeOpened(ctx: SlackEventMiddlewareArgs<"app_home_opened"> & AllMiddlewareArgs<StringIndexed>) {
    if (ctx.payload.tab !== "home") return;

    return ctx.client.views.publish({
        user_id: ctx.payload.user,
        view: await generateAppHome(ctx.payload.user, {})
    })
}