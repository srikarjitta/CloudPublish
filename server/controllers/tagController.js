const { Tag } = require('../models');
const { slugify } = require('../utils/slugify');

class TagController {
  async getTags(req, res, next) {
    try {
      const tags = await Tag.find().sort({ articleCount: -1, name: 1 });
      res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (err) {
      next(err);
    }
  }

  async createTag(req, res, next) {
    try {
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Tag name is required' });
      }

      const slug = slugify(name);
      let tag = await Tag.findOne({ slug });
      if (tag) {
        return res.status(409).json({ success: false, message: 'Tag already exists', data: tag });
      }

      tag = await Tag.create({
        name: name.trim(),
        slug,
        description: description ? description.trim() : '',
      });

      res.status(201).json({
        success: true,
        data: tag,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTag(req, res, next) {
    try {
      const tag = await Tag.findByIdAndDelete(req.params.id);
      if (!tag) {
        return res.status(404).json({ success: false, message: 'Tag not found' });
      }
      res.status(200).json({ success: true, message: 'Tag deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TagController();
