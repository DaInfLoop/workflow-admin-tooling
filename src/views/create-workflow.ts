import type { AllMiddlewareArgs, SlackViewAction, SlackViewMiddlewareArgs, StringIndexed } from "@slack/bolt";
import type { Workflow } from "@slack/web-api/dist/types/response/AdminWorkflowsSearchResponse";
import type { AdminWorkflowsCollaboratorsAddResponse } from "@slack/web-api";
import { userTokenApiCall } from "../../utils";
import { randomUUID } from "node:crypto";

export default async function CreateWorkflowSubmit(ctx: SlackViewMiddlewareArgs<SlackViewAction> & AllMiddlewareArgs<StringIndexed>) {
    const title = ctx.payload.state.values.title!.title!.value;
    const description = ctx.payload.state.values.description!.description!.value;

    const createWorkflow: {
        ok: true,
        workflow: Workflow
    } | {
        ok: false,
        error: string
    } = await userTokenApiCall('functions.workflows.create', {
        title,
        description,
        team_id: ctx.body.team!.id,
        _x_reason: 'workflow-builder/fetch-new-workflow'
    });

    if (!createWorkflow.ok) {
        return await ctx.ack({
            response_action: 'errors',
            errors: {
                title: createWorkflow.error,
                description: createWorkflow.error
            }
        })
    }

    const setTrigger = await userTokenApiCall('workflows.triggers.create', {
        type: 'shortcut',
        trigger_id: randomUUID(),
        inputs: {},
        workflow: createWorkflow.workflow.id,
        name: title,
        workflow_app_id: createWorkflow.workflow.app_id,
        team_id: createWorkflow.workflow.team_id,
        _x_reason: 'workflow-builder/fetch-new-trigger-from-templates'
    });

    if (!setTrigger.ok) {
        return await ctx.ack({
            response_action: 'errors',
            errors: {
                title: setTrigger.error,
                description: setTrigger.error
            }
        })
    }

    const addCollaborator: AdminWorkflowsCollaboratorsAddResponse = await userTokenApiCall('admin.workflows.collaborators.add', {
        workflow_ids: [ createWorkflow.workflow.id ],
        collaborator_ids: [ ctx.body.user.id ]
    })

    if (!addCollaborator.ok) {
        return await ctx.ack({
            response_action: 'errors',
            errors: {
                title: addCollaborator.error!,
                description: addCollaborator.error!
            }
        })  
    }

    await ctx.ack({ response_action: 'clear' });

    console.log('created a workflow!', title, setTrigger.trigger.share_url)
    
    await ctx.client.chat.postMessage({
        channel: ctx.body.user.id,
        text: `:neobot_happy: *<${setTrigger.trigger.share_url}|${title}>* was created! Check out the <https://app.slack.com/client/${ctx.body.team?.enterprise_id ?? ctx.body.team?.id}/platform|Tools pane> to edit it.`
    })
}