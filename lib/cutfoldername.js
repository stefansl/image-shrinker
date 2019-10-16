/*
 * Cut path from beginning, if necessary
 * return string
 */
const cutFolderName = (path) => {
    return path.length >= 48 ? '... ' + path.substr(length - 48) : path;
};

module.exports = cutFolderName;
module.exports.default = cutFolderName;