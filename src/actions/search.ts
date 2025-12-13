import type { AllMiddlewareArgs, BlockPlainTextInputAction, SlackActionMiddlewareArgs, StringIndexed } from "@slack/bolt";
import { generateAppHome } from "../events/app_home_opened";

export default async function SearchFilter(ctx: SlackActionMiddlewareArgs<BlockPlainTextInputAction> & AllMiddlewareArgs<StringIndexed>) {
    await ctx.ack();

    const viewOutput = ctx.body.view!;

    const options = JSON.parse(viewOutput.private_metadata);

    options.filters.search = ctx.action.value || undefined;

    ctx.client.views.publish({
        user_id: ctx.body.user.id,
        view: await generateAppHome(ctx.body.user.id, options)
    })
}