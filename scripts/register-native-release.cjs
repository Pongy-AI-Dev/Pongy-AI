'use strict';
// Run ONLY after building (and, for APK, verifying with the original signing certificate).
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const platform=process.argv[2];if(!['windows','android'].includes(platform))throw Error('Usage: node scripts/register-native-release.cjs windows|android');
const root=path.resolve(__dirname,'..'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,name=`Pongy-AI-${version}-${platform==='windows'?'windows-x64.msi':'android.apk'}`,file=path.join(root,'public','downloads',name),data=fs.readFileSync(file);
if(platform==='windows'&&!data.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex'))||platform==='android'&&!data.subarray(0,4).equals(Buffer.from('504b0304','hex')))throw Error('Not a native package; refusing to publish renamed content.');
const manifest=path.join(root,'public','downloads','releases.json'),release=JSON.parse(fs.readFileSync(manifest,'utf8'));release.version=version;release.files[platform]={name,version,sha256:crypto.createHash('sha256').update(data).digest('hex'),bytes:data.length};fs.writeFileSync(manifest,JSON.stringify(release,null,1)+'\n');console.log('Registered built package:',name,'(signature and installed behaviour must be checked separately)');
