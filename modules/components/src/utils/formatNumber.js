import toNumber from 'lodash/toNumber';

export default numOrString => {
  const n = toNumber(numOrString);
  return isNaN(n) ? numOrString : n.toLocaleString();
};
