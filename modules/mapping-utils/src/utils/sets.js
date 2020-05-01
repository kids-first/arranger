const MAX_LENGTH_NAME = 50;
const REGEX_FOR_TAG = /^[a-zA-Z0-9-_]*$/;

export const isTagValid = tag =>
  !tag || (tag.length <= MAX_LENGTH_NAME && REGEX_FOR_TAG.test(tag));
