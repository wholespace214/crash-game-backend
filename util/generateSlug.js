const slugify = require("slugify");

const generateSlug = (input) => {
  const slug = slugify(input, {
      lower: true,
      strict: true,
  });

  return slug;
}

module.exports = generateSlug;