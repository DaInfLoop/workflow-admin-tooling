export function userTokenApiCall(method: string, options: Record<string, unknown> | undefined): Promise<any> {
    return fetch('https://slack.com/api/' + method, {
        method: 'POST',
        headers: {
            Cookie: process.env.SLACK_COOKIE!,
            'Content-Type': 'application/json',
            Authorization: "Bearer " + process.env.USER_TOKEN,

        },
        body: JSON.stringify({
            token: process.env.SLACK_COOKIE,
            ...options
        })
    }).then(res => res.json()) as any
}