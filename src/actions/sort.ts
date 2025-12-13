import type { AllMiddlewareArgs, BlockStaticSelectAction, SlackActionMiddlewareArgs, StringIndexed } from "@slack/bolt";
import { generateAppHome } from "../events/app_home_opened";

export default async function ChangeSorting(ctx: SlackActionMiddlewareArgs<BlockStaticSelectAction> & AllMiddlewareArgs<StringIndexed>) {
    await ctx.ack();

    const viewOutput = ctx.body.view!;

    const options = JSON.parse(viewOutput.private_metadata);

    options.sort = ctx.action.selected_option.value;

    ctx.client.views.publish({
        user_id: ctx.body.user.id,
        view: await generateAppHome(ctx.body.user.id, options)
    })
}