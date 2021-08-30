import React, { } from 'react'
import { Box, H3, Button, Input} from '@admin-bro/design-system'
import { ApiClient, useNotice} from 'admin-bro'
import * as qs from "qs";
const api = new ApiClient()
const NOTICE_MESSAGE = {
    message: 'Mint successful',
    type: 'success',
}


const UserMint = (props) => {
    const { record } = props;
    let addBalance = 0;

    const addNotice = useNotice()

    const callAction = (record) => {
        api.recordAction({ recordId: record.id, actionName: 'do-mint', resourceId: 'User',
            data: qs.stringify({add: addBalance})}).then(res => {
            addNotice(NOTICE_MESSAGE);

            window.location.reload(true);
        })
    };

    const handleChange = (e) => {
        addBalance = e.target.value;
    };

     const balance = record.params.balance === undefined ? 0 : record.params.balance;

    return (
        <Box variant="grey">
            <Box variant="white">
                {console.log(record.params.balance)}
                <H3>Mint WFAIR - {record.params.username}</H3>
                <Box>
                    <p>{'Current balance: ' + balance + ' WFAIR'}</p>
                    <br />


                    <p>Adding balance:</p>
                    <Input onChange={handleChange} type="number"></Input>

                    <br />
                    <br />

                    <Button onClick={() => {callAction(record);}}>Mint WFAIR</Button>
                </Box>
            </Box>
        </Box>
    )
}

export default UserMint