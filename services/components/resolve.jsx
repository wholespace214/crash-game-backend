import React, { } from 'react'
import { Box, H3, Placeholder, Button} from '@admin-bro/design-system'
import { ApiClient, useNotice} from 'admin-bro'

const api = new ApiClient()
const NOTICE_MESSAGE = {
    message: 'Bet resolved',
    type: 'success',
}


const SomeStats = (props) => {
    const { record } = props;

    const addNotice = useNotice()

    const callAction = (record, option) => {
        api.recordAction({ recordId: record.id, actionName: option+'-resolve', resourceId: 'Bet'}).then(res => {
            addNotice(NOTICE_MESSAGE);
        })
    };

    const showBtn = (record.params.winner === undefined);

    return (
        <Box variant="grey">
            <Box variant="white">
                <H3>Resolve BET - {record.title}</H3>
                <Box>
                    <p>{showBtn ? 'This action cannot be reversed! Pick the winner to resolve the trade!' : 'The winner is: ' + record.params.winner} </p>
                    <br />
                    <p>
                        {showBtn &&(
                            <Button onClick={() => {callAction(record, 'yes');}}>{record.params.betOne}</Button>
                        )

                        }
                        {showBtn &&
                                <Button onClick={() => {callAction(record, 'no');}}>{record.params.betTwo}</Button>
                        }
                    </p>
                </Box>
            </Box>
        </Box>
    )
}

export default SomeStats