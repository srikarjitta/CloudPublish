class MediaController {
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded or file was rejected by filter',
        });
      }

      const relativeUrl = `/uploads/articles/${req.file.filename}`;

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: relativeUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MediaController();

