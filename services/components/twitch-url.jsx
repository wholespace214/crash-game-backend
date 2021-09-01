import React from "react";
import { useHistory } from "react-router-dom";
import { Box, H3, Button, Input } from "@admin-bro/design-system";
import ShowAction, { ApiClient, useNotice, ViewHelpers } from "admin-bro";
import * as qs from "qs";
import EditAction from "admin-bro";
import flatten from "flat";

const api = new ApiClient();
const NOTICE_MESSAGE = {
    message: "Event created",
    type: "success",
};

const FromTwitch = (props) => {
    const { record } = props;
    const history = useHistory();

    const viewHelper = new ViewHelpers();

    const addNotice = useNotice();

    let twitch_url = '';

    const callAction = () => {
        api.resourceAction({
                resourceId: "Event",
                actionName: "do-import-event-from-twitch-url",
                data: qs.stringify({twitch_url})
            })
            .then((res) => {
                console.log(res);

                window.location = `/admin/resources/Event/records/${res.data.eventId}/show`
            });
    };

    const handleChange = (e) => {
        twitch_url = e.target.value;
    };

    return (
        <Box variant="grey">
            <Box variant="white">
                <H3>Create event from Twitch URL</H3>
                <Box>
                    <Input onChange={handleChange} type="text"></Input>
                    <Button
                        onClick={() => {
                            callAction();
                        }}
                    >
                        Create Event
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default FromTwitch;
