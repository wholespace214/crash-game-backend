import React, {useState, useEffect, useCallback} from "react";
import { Box, Label, Input } from "@admin-bro/design-system";
import generateSlug from "../../util/generateSlug";

const SlugInput = (props) => {
    const { record, property } = props;

    const [ignoreName, setIgnoreName] = useState(true);
    const [slug, setSlug] = useState(record.params[property.path]);

    useEffect(() => {
        //Ignore first render of the Name field so it gets the current slug value 
        if (!ignoreName) {
            console.log('name changed!!!');

            const slug = generateSlug(record.params['name']);
            setSlug(slug);
        } else {
            setIgnoreName(false);
        }
    }, [record.params['name']]);

    const handleChange = useCallback((event) => {
        setSlug(event.target.value);
    });

    const handleBlur = useCallback((event) => {
        const slug = generateSlug(event.target.value);
        setSlug(slug);
    });

    return (
        <Box>
            <Label>{property.label}</Label>
            <Input type="text" onChange={handleChange} onBlur={handleBlur} value={slug} />
        </Box>
    );
};

export default SlugInput;
