import slugify from "slugify";

const generateSlug = (input) => {
  const slug = slugify(input, {
      lower: true,
      strict: true,
  });

  return slug;
}

export default generateSlug;