/**
 * Generate a URL-friendly slug from a title string
 * @param {string} text - The input title
 * @returns {string} - Clean, hyphenated slug
 */
function slugify(text) {
  if (!text || typeof text !== 'string') return 'article';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // decompose accents
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .replace(/[_\s]+/g, '-') // convert underscores and whitespace to hyphens
    .replace(/[^a-z0-9-]/g, '') // remove invalid characters
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    || 'article';
}

/**
 * Generate a guaranteed unique slug for a Mongoose model
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @param {string} title - The title to slugify
 * @param {string|null} currentId - Optional existing document _id to exclude from uniqueness check
 * @returns {Promise<string>} - Unique slug
 */
async function generateUniqueSlug(Model, title, currentId = null) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (currentId) {
      query._id = { $ne: currentId };
    }

    const existing = await Model.findOne(query).select('_id').lean();
    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

module.exports = {
  slugify,
  generateUniqueSlug,
};
