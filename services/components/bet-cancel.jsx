import React, { } from 'react'
import { Box, H3, Button, Input} from '@admin-bro/design-system'
import { ApiClient, useNotice} from 'admin-bro'
import * as qs from "qs";
const api = new ApiClient()
const NOTICE_MESSAGE = {
    message: 'Bet cancel & refund successful',
    type: 'success',
}


const BetCancel = (props) => {
    const { record } = props;
    let cancelReason = '';

    const addNotice = useNotice()

    const callAction = (record) => {
        api.recordAction({ recordId: record.id, actionName: 'do-cancel', resourceId: 'Bet',
            data: qs.stringify({reason: cancelReason})}).then(res => {
            addNotice(NOTICE_MESSAGE);

            window.location.reload(true);
        })
    };

    const handleChange = (e) => {
        cancelReason = e.target.value;
    };

    const allowRefund = record.params.canceled;

    return (
        <Box variant="grey">
            <Box variant="white">
                <H3>Bet  - {record.params.marketQuestion}</H3>
                <Box>
                    <br />

                    { !allowRefund &&
                       <div>
                           <p>Reason for cancel:</p>


                           <Input onChange={handleChange} type="text"></Input>

                           <br />
                           <br />

                           <Button onClick={() => {callAction(record);}}>Canele & refund bet</Button>
                       </div>
                    }

                    {allowRefund &&
                        <p>Bet already cancelled</p>
                    }
                </Box>
            </Box>
        </Box>
    )
}

export default BetCancel