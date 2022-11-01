module.exports = {
  CUSTOM_TEMPLATE_DIR: 'templates',
  DEFAULT_FILE_ENCODING: 'UTF-8',
  DEFAULT_METADATA_FILE_NAME: 'featurebook.json',
  DEFAULT_SUMMARY_FILE_NAME: 'SUMMARY.md',
  DEFAULT_IGNORE_FILE_NAME: '.featurebookignore',
  DEFAULT_ASSETS_DIR: 'assets',
  DEFAULT_DIST_DIR: 'dist',
  GIT_REPO_DIR: '.git',
  GIT_IGNORE_FILE_NAME: '.gitignore',
  MARKDOWN_FILES: '*.md',
  PLANTUML_FILES: '*.puml',
  MERMAID_FILES: '*.mmd',
  PNG_FILES: '*.png',
  JPG_FILES: '*.jpg',
  JPEG_FILES: '*.jpeg',
  GIF_FILES: '*.jpeg',
  SCRUM_FILES: '*.scrum',
  SPRINT_FILES: '*.sprint',
};

module.exports.DEFAULT_IGNORE_PATTERNS = Object.values(module.exports);
