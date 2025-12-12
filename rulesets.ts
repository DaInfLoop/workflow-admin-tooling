import type { Workflow } from "@slack/web-api/dist/types/response/AdminWorkflowsSearchResponse";

type Ruleset = {
    name: string,
    run: (workflow: Workflow) => boolean
}

export default [
    {
        // Why? Well, mostly because a lot of filters will use `Workflow#steps`, and not take into account the steps in each branch.
        name: "Filter branching workflows",
        run: (workflow) =>
            workflow.steps!.some(step => step.function_id === StepFunctionIDs.switch_step)
    },

    {
        name: "Filter webhook triggers",
        run: (workflow) =>
            workflow.trigger_ids!.includes(TriggerTypeIDs["From a webhook"])
    },
    
    {
        name: "Filter keyword execution trigger",
        run: (workflow) =>
            workflow.trigger_ids!.includes(TriggerTypeIDs["When a message is posted"])
    },

    {
        name: "Filter list recursion attempts",
        run: (workflow) =>
            workflow.trigger_ids!.includes(TriggerTypeIDs["When a list item is updated"]) &&
            workflow.steps!.some(step => step.function_id === StepFunctionIDs.update_list_record)
    },

    {
        name: "Filter custom triggers",
        run: (workflow) =>
            workflow.trigger_ids!.some(id => !triggerTypeIds.includes(id))
    },

    {
        name: "Filter custom steps",
        run: (workflow) =>
            workflow.steps!.some(step => !stepFunctionIds.includes(step.function_id!))
    },

] as Ruleset[];

// Mapped enums for triggers + Slack built-in steps:
enum TriggerTypeIDs {
    "From a link in Slack" = "Ftt0101",
    "On a schedule" = "Ftt0104",
    "When an emoji reaction is used" = "Ftt0102",
    "When a person joins a channel" = "Ftt0103",
    "When a list item is updated" = "Ftt0106",
    "From a webhook" = "Ftt0107",
    "When the app is mentioned" = "Ftt010A",
    "When the channel is archived" = "Ftt010B",
    "When a channel is deleted" = "Ftt010C",
    "When a channel is renamed" = "Ftt010D",
    "When a channel is shared" = "Ftt010E",
    "When a channel is unarchived" = "Ftt010F",
    "When a channel is unshared" = "Ftt010G",
    "When a person changes their DND setting" = "Ftt010H",
    "When a custom emoji is added or changed" = "Ftt010J",
    "When a List item is created" = "Ftt0109",
    "When message metadata is posted" = "Ftt010K",
    "When a message is posted" = "Ftt010L",
    "When a pin is added to a channel" = "Ftt010M",
    "When a pin is removed from a channel" = "Ftt010N",
    "When an emoji reaction is removed from a message" = "Ftt010P",
    "When a shared channel invitation is accepted" = "Ftt010Q",
    "When a shared channel invitation is approved" = "Ftt010R",
    "When a shared channel invitation is declined" = "Ftt010S",
    "When a shared channel invitation is received" = "Ftt010T",
    "When a shared channel invitation is requested" = "Ftt010X",
    "When a person joins a workspace" = "Ftt010V",
    "When a person leaves a channel" = "Ftt010U",
    "When a project is created in a workspace" = "Ftt07B1DKC6MU",
    "When a task in a workspace has an assignee update" = "Ftt074FRVTHLM",
    "When a task in a workspace is completed" = "Ftt0757GZ8MME",
    "When a task in a workspace is updated" = "Ftt074C4H60MC",
    "When a task is added to a workspace" = "Ftt072MCFDJR2",
    "When a project to-do in a group is completed" = "Ftt07FTAATW8P",
    "When a project to-do is added" = "Ftt07A23J8CBF",
    "When a project to-do is added to a group" = "Ftt07GLGS01FT",
    "When a project to-do is completed" = "Ftt079QDMNG7R",
    "When a pull request is merged in a repository (Bitbucket)" = "Ftt079ZL4Q9T4",
    "When a pull request is opened in a repository (Bitbucket)" = "Ftt079T1HMQ0N",
    "When an issue is created in a repository (Bitbucket)" = "Ftt07ACAALLEM",
    "When a task in a team's space changes status" = "Ftt079PK56AFN",
    "When a task is added to a team's space" = "Ftt079J7XQJA1",
    "When a pull request is merged in a repository (GitHub)" = "Ftt077EGX7YJK",
    "When a pull request is opened in a repository (GitHub)" = "Ftt077V3Z01U2",
    "When an issue is closed in a repository (GitHub)" = "Ftt077V0NRM43",
    "When an issue is created in a repository (GitHub)" = "Ftt0787PJQWSV",
    "When a pull request is merged in a repository (GitHub Enterprise Server)" = "Ftt077MRAMYLE",
    "When a pull request is opened in a repository (GitHub Enterprise Server)" = "Ftt078H8CJBG8",
    "When an issue is closed in a repository (GitHub Enterprise Server)" = "Ftt077UEFPU1G",
    "When an issue is created in a repository (GitHub Enterprise Server)" = "Ftt077UB5KXL3",
    "When a project in a team changes target date" = "Ftt07GABFJVV2",
    "When an issue in a team changes status" = "Ftt07G17VPH4N",
    "When an issue is added in a team" = "Ftt079YDBDT5L",
    "When a board item has an update" = "Ftt07DZQN5VHC",
    "When an item is added to a board" = "Ftt07EV7MJTK2",
    "When an incident is created" = "Ftt070Z8P6MBQ",
    "When an incident is created for a team" = "Ftt0715T9DQCA",
    "When an incident is resolved" = "Ftt072BDA4CE5",
    "When an incident is resolved for a team" = "Ftt071S4MAJBY",
    "When a task in a folder changes status" = "Ftt07AA2QDAFN",
    "When a task is created in a folder" = "Ftt07ATPTA6HW"
}

const triggerTypeIds = Object.values(TriggerTypeIDs) as string[];

enum StepFunctionIDs {
    send_message = "Fn0102",
    update_channel_topic = "Fn0105",
    create_channel = "Fn0106",
    invite_user_to_channel = "Fn0107",
    delay = "Fn0108",
    archive_channel = "Fn0109",
    create_usergroup = "Fn010A",
    add_user_to_usergroup = "Fn010B",
    add_pin = "Fn010E",
    send_ephemeral_message = "Fn010F",
    remove_user_from_usergroup = "Fn010H",
    send_dm = "Fn010M",
    open_form = "Fn010N",
    reply_in_thread = "Fn010P",
    add_reaction = "Fn010S",
    remove_reaction = "Fn010T",
    share_list_users = "Fn0131",
    list_add_record = "Fn0133",
    read_list_record = "Fn013B",
    copy_list = "Fn013C",
    update_list_record = "Fn013E",
    delete_list_record = "Fn013F",
    lists_activity_feed = "Fn013G",
    send_task_list_alert = "Fn013H",
    create_items_due_summary = "Fn014E",
    add_bookmark = "Fn010W",
    canvas_create = "Fn011G",
    canvas_copy = "Fn011L",
    share_canvas = "Fn011X",
    share_canvas_in_thread = "Fn011Y",
    canvas_update_content_v2 = "Fn0127",
    add_canvas_to_channel_tab = "Fn0128",
    summarize_channel = "Fn015X",
    add_agent_to_channel = "Fn0164",
    switch_step = "Fn0201"
}

const stepFunctionIds = Object.values(StepFunctionIDs) as string[];