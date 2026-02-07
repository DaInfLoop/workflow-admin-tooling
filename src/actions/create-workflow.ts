import type { AllMiddlewareArgs, BlockButtonAction, SlackActionMiddlewareArgs, StringIndexed } from "@slack/bolt";
import { getTriggers } from "../../utils";

export default async function CreateWorkflowButton(ctx: SlackActionMiddlewareArgs<BlockButtonAction> & AllMiddlewareArgs<StringIndexed>) {
    await ctx.ack();

    const triggers = await getTriggers();

    ctx.client.views.open({
        trigger_id: ctx.body.trigger_id,
        view: {
            type: 'modal',
            callback_id: 'create-workflow',
            title: {
                type: 'plain_text',
                text: 'Create workflow'
            },
            submit: {
                type: 'plain_text',
                text: 'Create'
            },
            close: {
                type: 'plain_text',
                text: 'Cancel'
            },
            blocks: [
                {
                    type: 'input',
                    block_id: 'title',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'title',
                        initial_value: 'Untitled workflow',
                        placeholder: {
                            type: 'plain_text',
                            text: 'Untitled workflow'
                        },
                        max_length: 80,
                        min_length: 1
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Workflow Title'
                    },
                    optional: false
                },
                {
                    type: 'input',
                    block_id: 'description',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'description',
                        initial_value: 'A brand new workflow',
                        placeholder: {
                            type: 'plain_text',
                            text: 'A brand new workflow'
                        },
                        max_length: 80,
                        min_length: 1
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Workflow Description'
                    },
                    optional: false
                },
                {
                    type: 'input',
                    block_id: 'trigger',
                    element: {
                        type: 'static_select',
                        option_groups: Object.values(triggers).map(group => ({
                            label: {
                                type: 'plain_text',
                                text: group.name
                            },
                            options:
                                group.triggers.map(trigger => ({
                                    text: {
                                        type: 'plain_text',
                                        text: trigger.label
                                    },
                                    value: trigger.id
                                }))
                        }))
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Workflow start trigger'
                    }
                }
            ]
        }
    })
}