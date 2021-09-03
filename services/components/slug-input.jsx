import React, {useState, useEffect, useCallback} from "react";
import { Box, Label, Input } from "@admin-bro/design-system";
import generateSlug from "../../util/generateSlug";

const SlugInput = (props) => {
    const { record, property } = props;

    const [ignoreName, setIgnoreName] = useState(true);
    const [slug, setSlug] = useState(record.params[property.path]);

    const setSlugRecordParam = (value) => {
        // Update slug value on Record params, so it's passed to the request body when the form is saved
        record.params[property.path] = value;
    }

    useEffect(() => {
        //Ignore first render of the Name field so it gets the current slug value 
        if (!ignoreName) {
            console.log('name changed!!!');

            const newSlug = generateSlug(record.params['name']);
            setSlug(newSlug);
            setSlugRecordParam(newSlug);
        } else {
            setIgnoreName(false);
        }
    }, [record.params['name']]);

    const handleChange = useCallback((event) => {
        const newSlug = event.target.value;
        setSlug(newSlug);
        setSlugRecordParam(newSlug);
    });

    return (
        <Box>
            <div style={{marginBottom: "32px"}}> 
                <Label required>SEO-optimized name</Label>
                <div style={{display: "flex", alignItems: "center", columnGap:"20px", color:"#999"}}>
                    <Input type="text" onChange={handleChange} value={slug} />
                    {slug && <p>URL Preview: {`${AdminBro.env.CLIENT_URL}/trade/${slug}`}</p>}
                </div>
            </div>
        </Box>
    );
};

export default SlugInput;
