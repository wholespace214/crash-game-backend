import React from "react";
import { useHistory } from "react-router-dom";
import { Box, H3, Button, Input } from "@admin-bro/design-system";
import ShowAction, { ApiClient, useNotice, ViewHelpers } from "admin-bro";
import * as qs from "qs";
import EditAction from "admin-bro";
import flatten from "flat";

const api = new ApiClient();
const NOTICE_MESSAGE = {
  message: "Bet successful created",
  type: "success",
};

const NewBet = (props) => {
  const { record } = props;
  const history = useHistory();
  let addBalance = 0;

  const viewHelper = new ViewHelpers();

  const addNotice = useNotice();

  const callAction = (record) => {
    const flatRecord = flatten.unflatten(record.params, {
      safe: true,
    });

    api
      .recordAction({
        recordId: record.id,
        actionName: "do-new-bet-from-template",
        resourceId: "Event",
      })
      .then((res) => {
        addNotice(NOTICE_MESSAGE);

        //window.location.reload(true);
        console.log(viewHelper.editUrl("Bet", res.data.record.params.createdBet));
        history.push(viewHelper.editUrl("Bet", res.data.record.params.createdBet));
      });
  };

  return (
    <Box variant="grey">
      <Box variant="white">
        {console.log(record.params.balance)}
        <H3>Create Bet from template - {record.params.name}</H3>
        <Box>
          <Button
            onClick={() => {
              callAction(record);
            }}
          >
            Create
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NewBet;
