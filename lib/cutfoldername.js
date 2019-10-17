/*
 * Cut path from beginning, if necessary
 * @param  {string} path    Filepath
 * @param  {integer} length max length
 * @return {string}         truncated string
 */
const cutFolderName = (path, length = 20) => {
    return path.length >= length ? '... ' + path.substr(path.length - length) : path;
};

module.exports = cutFolderName;