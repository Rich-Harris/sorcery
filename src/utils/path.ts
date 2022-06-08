import * as url from 'url';

export function slash ( path: string ) {
	return typeof path === 'string' ?
		path.replace( /\\/g, '/' ) :
		path;
}


// what about https://nodejs.org/docs/latest-v16.x/api/url.html#urlfileurltopathurl
export function manageFileProtocol(file: string) {
    // resolve file:///path to /path
    if (!!file && file.indexOf('file://') === 0) {
        file = url.parse(file)['path'];
    }
    return file;
}
