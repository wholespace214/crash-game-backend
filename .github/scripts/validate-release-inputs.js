if (!['staging', 'production'].includes(process.env.stage)) {
    console.log("stage must be either 'staging' or 'production' but it was ", process.env.stage);
    process.exit(1);
}

if (['dev', 'prod', 'latest'].includes(process.env.version)) {
    console.log("version must follow semantic syntax like 1.x.x, 'prod', 'dev' and 'latest' are not valid inputs, but it was ", process.env.version);
    process.exit(1);
}