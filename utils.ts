export function userTokenApiCall<T>(method: string, options: Record<string, unknown> | undefined): Promise<{ ok: false, error: string } | ({ ok: true } & T)> {
    return fetch('https://slack.com/api/' + method, {
        method: 'POST',
        headers: {
            Cookie: `d=${encodeURIComponent(process.env.SLACK_COOKIE!)}`,
            'Content-Type': 'application/json',
            Authorization: "Bearer " + process.env.USER_TOKEN,
        },
        body: JSON.stringify(options)
    }).then(res => res.json()) as Promise<{ ok: false, error: string } | ({ ok: true } & T)>
}

type WorkflowTrigger = {
    is_available_to_user: boolean,
    private_channel_access?: string,
    private_channel_message?: boolean,
    trigger_type: {
        id: string,
        icon: string,
        label: string,
        group: string,
        type: string,
        app_id: string,
        description: string
        service_config?: {
            function: {
                app: {
                    id: string,
                    name: string
                }
            }
        }
    },
}

export async function getTriggers() {
    const triggers = await userTokenApiCall<{
        trigger_types: WorkflowTrigger[]
    }>('workflows.triggers.types.list', {});

    if (!triggers.ok) {
        throw new Error('couldn\'t get triggers: ' + triggers.error)
    }

    const toReturn: Record<string, {
        name: string,
        id: string,
        triggers: WorkflowTrigger['trigger_type'][]
    }> = {
        A03: {
            name: "Slack",
            id: "A03",
            triggers: []
        }
    };

    for (const trigger of triggers.trigger_types) {
        if (!(trigger.trigger_type.app_id in toReturn)) {
            toReturn[trigger.trigger_type.app_id] = {
                name: trigger.trigger_type.service_config!.function.app.name,
                id: trigger.trigger_type.app_id,
                triggers: []
            }
        }

        toReturn[trigger.trigger_type.app_id]!.triggers.push(trigger.trigger_type);
    }

    return toReturn
};

type WorkflowFunction = {
    id: string,
    callback_id: string,
    title: string,
    description: string,
    type: "app" | "utility" | "builtin",
    input_parameters: {}[],
    output_parameters: {}[],
    category_id: string,
    category_label: string,
};

export async function getFunctions() {
    const functions: Record<string, {
        name: string,
        id: string,
        functions: WorkflowFunction[]
    }> = {
        builtins_canvas: {
            name: "Canvas",
            id: "builtins_canvas",
            functions: []
        },
        builtins_channels: {
            name: "Channels",
            id: "builtins_channels",
            functions: []
        },
        builtins_forms: {
            name: "Forms",
            id: "builtins_forms",
            functions: []
        },
        builtins_list: {
            name: "List",
            id: "builtins_list",
            functions: []
        },
        builtins_messages: {
            name: "Messages",
            id: "builtins_messages",
            functions: []
        },
        builtins_users: {
            name: "Users",
            id: "builtins_users",
            functions: []
        },
        builtins_utilities: {
            name: "Utilities",
            id: "builtins_utilities",
            functions: []
        }
    }

    const responses = await Promise.allSettled([
        'builtins',
        'certified_apps',
        'installed_apps',
        'utilities'
    ].map(function_type => userTokenApiCall<{ functions: WorkflowFunction[] }>('functions.list', { function_type })));

    for (const res of responses) {
        if (res.status === "rejected") continue;
        if (!res.value.ok) continue;

        for (const func of res.value.functions) {
            if (!(func.category_id in functions)) {
                functions[func.category_id] = {
                    name: func.category_label,
                    id: func.category_id,
                    functions: []
                }
            }

            functions[func.category_id]!.functions.push(func);
        }
    }

    return functions
}