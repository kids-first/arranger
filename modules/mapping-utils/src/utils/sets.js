const REGEX_FOR_TAG = /^[a-zA-Z0-9-_ ]*$/;

export const MAX_LENGTH_TAG = 50;

export const isTagValid = rawTag => {
  const tag = (rawTag || '').trim();
  return !!tag && tag.length <= MAX_LENGTH_TAG && REGEX_FOR_TAG.test(tag);
};

export const addSqonToSetSqon = (receivingSqon, donorSqon, op = 'or') => {
  // Fixme incomplete
  const receivingContent = receivingSqon?.content || [];
  const donorContent = donorSqon?.content || [];
  return {
    op,
    content: [...receivingContent, ...donorContent],
  };
};

export const removeSqonToSetSqon = (setSqon, sqonToRemove) => {
  // Fixme incomplete
  const setSqonContent = setSqon?.content || [];
  const sqonToRemoveContent = sqonToRemove?.content || [];
  const negatedContent = sqonToRemoveContent.map(filter => ({
    op: 'not-in',
    content: filter.content,
  }));
  return {
    op: 'and',
    content: [...setSqonContent, ...negatedContent],
  };
};

export const makeUnique = ids => [...new Set(ids)];

const MAX_NUMBER_OF_IDS = 20000;

export const truncateIds = ids => (ids || []).slice(0, MAX_NUMBER_OF_IDS);
