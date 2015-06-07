export default function slash(path) {
  if (typeof path === 'string')
    return path.replace(/\\/g, '/');
  return path;
}