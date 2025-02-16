const core = require( '@actions/core' );
const github = require( '@actions/github' );
const { processReederBookmarkFeed } = require( './process' );
const fs = require( 'fs' );

async function run ( ) {
  await processReederBookmarkFeed( 'https://149ff8376a964c67a0af03641403af20.s3.pub1.infomaniak.cloud/feeds/OLJcTWYhRySITeLoxvDecQ.json' );
  
  try {} catch ( error ) {
    core.setFailed( error.message );
  }
}

run( );