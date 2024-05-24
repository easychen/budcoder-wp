import React, { useRef, useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { startPlaygroundWeb } from '@wp-playground/client';
import { Button, InputGroup, ControlGroup } from '@blueprintjs/core';

const App = () => {
  const iframeRef = useRef(null);
  let playground = null;
  const [url, setUrl] = useState('/wp-admin/plugins.php');

  useEffect(() => {
    const loadPlayground = async () => {
      const client = await startPlaygroundWeb({
        // iframe: iframeRef.current,
        iframe: document.getElementById('theframe'),
        remoteUrl: 'https://playground.wordpress.net/remote.html',
        blueprint:
        {
          landingPage: '/wp-admin',
          steps: [
            {
                step: 'login',
                username: 'admin',
                password: 'password',
            },
            {
                step: 'installPlugin',
                pluginZipFile: {
                    resource: 'url',
                    url: 'https://localhost:5173/absolute-reviews-s1KZjfh8-1716526237.zip'
                },
            },
        ],

        }
      });
      await client.isReady();
      client.goTo(url);
      playground = client;
    };

    loadPlayground();
  }, []);

  async function test(){
    console.log('test', playground);
    const response = await playground.run({
      // wp-load.php is only required if you want to interact with WordPress.
      code: '<?php require_once "/wordpress/wp-load.php"; $posts = get_posts(); echo "Post Title: " . $posts[0]->post_title;',
    });
    console.log(response.text); 
  }

  async function navigator(){
    playground.goTo(url);
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 border-r border-black flex flex-col">
        <div className="line-1 bg-black">
          <Button onClick={()=>test()}>test</Button>
        </div>
        <MonacoEditor
          height="100%"
          theme='vs-dark'
          defaultLanguage="javascript"
          defaultValue="// Type your code here..."
        />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="line-1 flex flex-row items-center">
          <div className="left flex-1">
          <InputGroup
            placeholder='enter url'
            className="flex-1 mr-1 p-1"
            value={url}
            onChange={(e)=>setUrl(e.target.value)}
          />
          </div>
          <div className="right">
          <Button className="mr-1" onClick={()=>navigator()} >访问</Button>
          </div>
          
        </div>
        <iframe
          ref={iframeRef}
          id="theframe"
          className="w-full h-full border-none"
          title="WordPress Playground"
        />
      </div>
    </div>
  );
};

export default App;
