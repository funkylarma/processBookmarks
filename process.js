const fs = require( 'fs' );
const path = require( 'path' );
const axios = require( 'axios' );
const { parseStringPromise } = require( 'xml2js' );
const sanitize = require( 'sanitize-filename' );
const TurndownService = require( 'turndown' );
const { format } = require( 'date-fns' );

async function processReederBookmarkFeed ( url ) {
  try {
    
    // Get the template file
    const template = fs.readFileSync( './includes/templates/reeder-bookmark.md', 'utf8' );
    
    // Fetch and parse the RSS feed
    const feedData = await fetchAndParseFeed( url );
    
    let entries = feedData.items;
    
    // Process the feed entries and generate Markdown files
    entries.forEach( ( entry ) => {
      try {
        const { output, date, title } = generateFeedMarkdown( template, entry );
        const filePath = saveMarkdown( date, title, output );
        
        console.log( `Markdown file '${filePath}' created.` );
      } catch ( error ) {
        console.error( `Error processing feed entry for ${url}` );
        console.error( error.message );
      }
    } );
  } catch ( error ) {
    console.error( `Error processing feed at ${url}` );
    console.error( error.message );
  }
}

// Fetch the RSS feed
async function fetchAndParseFeed ( feedUrl ) {
  const response = await axios.get( feedUrl );
  const feedData = response.data;
  
  if ( typeof feedData === 'object' ) {
    // Assume it's a JSON feed
    return feedData;
  } else {
    // Assume it's an XML feed (RSS or Atom)
    return parseStringPromise( feedData );
  }
}

// Main function for generating Markdown
const generateFeedMarkdown = ( template, entry ) => {
  
  // Get the id
  const id = entry.id;
  
  // Set the date watched
  let date = new Date( entry.date_published || '' );
  
  // Get the movie url
  const link = entry.url;
  
  // Get the movie title
  const title = entry.title;
  
  // Get the description
  const content = entry?.content_text || '';
  
  // Extract the Letterboxd image as a cover image
  let cover = entry?.image || '';
  console.log( `Cover image: ${cover}` );
  
  // Convert the content into Markdown
  const markdown = new TurndownService( {
      codeBlockStyle: 'fenced',
      fenced: '```',
      bulletListMarker: '-',
    } )
    .turndown( content );
  
  // Extract author, handling possible formats across feed types
  const author = entry.authors?.[ 0 ]?.[ 'name' ] || 'Unknown Author';
  
  // Final output preparation
  return generateOutput( template, {
    id,
    date,
    link: link.trim( ),
    title,
    cover,
    markdown,
    author,
  } );
};

// Helper function to generate the output
const generateOutput = ( template, data ) => {
  
  // Replace with the data entry
  const output = template
    .replaceAll( '[ID]', data.id || '' )
    .replaceAll( '[DATE]', format( new Date( data.date ), 'yyyy-MM-dd' ) )
    .replaceAll( '[LINK]', data.link || '' )
    .replaceAll( '[TITLE]', data.title.replace( /[^\w\s-]/g, '' ) || '' )
    .replaceAll( '[COVER]', data.cover || '' )
    .replaceAll( '[MARKDOWN]', data.markdown || '' )
    .replaceAll( '[AUTHOR]', data.author || '' );
  
  return { output, date: data.date || '', title: data.title || '' };
};

function saveMarkdown ( date, title, markdown ) {
  // Set the output directory
  let outputDir = 'src/bookmarks/';
  
  let pubdate = new Date( date );
  let year = pubdate.getFullYear( )
    .toString( );
  let month = ( pubdate.getMonth( ) + 1 )
    .toString( )
    .padStart( 2, '0' );
  const slug = slugify( title.toLowerCase( ) )
    .substring( 0, 50 );
  const fileName = `${slug}.md`;
  
  year = path.join( outputDir, year );
  if ( !fs.existsSync( year ) ) {
    fs.mkdirSync( year, { recursive: true } );
    console.log( `Output directory '${year}' created.` );
  }
  
  month = path.join( year, month );
  if ( !fs.existsSync( month ) ) {
    fs.mkdirSync( month, { recursive: true } );
    console.log( `Output directory '${month}' created.` );
  }
  
  const filePath = path.join( month, fileName );
  
  if ( fs.existsSync( filePath ) ) {
    console.log( `File ${filePath} already exists` );
  } else {
    console.log( `Writing ${filePath}` );
    fs.writeFileSync( filePath, markdown );
  }
  
  return filePath;
}

function slugify ( str ) {
  str = str.replace( /^\s+|\s+$/g, '' ); // trim leading/trailing white space
  str = str.toLowerCase( ); // convert string to lowercase
  str = str
    .replace( /[^a-z0-9 -]/g, '' ) // remove any non-alphanumeric characters
    .replace( /\s+/g, '-' ) // replace spaces with hyphens
    .replace( /-+/g, '-' ); // remove consecutive hyphens
  return str;
}

module.exports = {
  processReederBookmarkFeed
};