import React, { useRef, useEffect, useState } from 'react';
// import MonacoEditor from '@monaco-editor/react';
import { startPlaygroundWeb } from '@wp-playground/client';
import { Button, InputGroup, ButtonGroup, TextArea, Dialog, DialogBody, DialogFooter, AnchorButton, ControlGroup, HTMLSelect } from '@blueprintjs/core';
import RiseLoader from 'react-spinners/RiseLoader';
import useLocalStorageState from 'use-local-storage-state';
import { createPrompt, modifyPrompt } from './prompt';
import OpenAI from 'openai';
import MarkdownDiv from './MarkdownDiv';
import toast, { Toaster } from 'react-hot-toast';

const App = () => {
  const iframeRef = useRef(null);
  let playground = null;
  // const [url, setUrl] = useState('/wp-admin/plugins.php');
  const [url, setUrl] = useState('/wp-admin/plugin-editor.php?file=absolute-reviews-s1KZjfh8-1716526237%2Fabsolute-reviews.php&plugin=absolute-reviews-s1KZjfh8-1716526237%2Fabsolute-reviews.php');
  const [prompt, setPrompt] = useState('请在后台的文章列表添加一个字段用于显示文章的阅读次数。');

  const [showSettingsBox, setShowSettingsBox] = useState(false);
  const [settings, setSettings] = useLocalStorageState('settings', {
    defaultValue: {
      ai_key: '',
      ai_apibase: 'https://api.openai.com',
      ai_model: 'gpt-4o'
    },
  });
  const [chatList, setChatList] = useLocalStorageState('chatList', {
    defaultValue: [],
  });

  const [currentPlugin, setCurrentPlugin] = useState('-new-');
  const [currentPluginSlug, setCurrentPluginSlug] = useLocalStorageState('currentPluginSlug', {
    defaultValue: '',
  });
  const [plugins, setPlugins] = useState([]);

  const [loading, setLoading] = useState(false);
  const blueprint = {
      landingPage: '/wp-admin',
      features: {
        "networking": true
      },
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

    };

  useEffect(() => {
    const loadPlayground = async () => {
      const client = await startPlaygroundWeb({
        iframe: iframeRef.current,
        remoteUrl: 'https://playground.wordpress.net/remote.html',
        blueprint
      });
      await client.isReady();
      client.onNavigation( path => {
        // 从 path 中提取 plugin=encoded_name
        const match = path.match(/(&|\?)plugin=([^&]+)/);
        // console.log("match", match)
        if (match) {
          const decodedName = decodeURIComponent(match[2]);
          if( decodedName )
            setCurrentPlugin(decodedName.split('/')[0]);
        }
        setUrl(path);
        setLoading(false);
      });
      client.goTo(url);
      playground = client;
      loadPlugins();
    };

    loadPlayground();
  }, []);

  async function loadPlugins(){
    const ret = await playground.listFiles('/wordpress/wp-content/plugins/');
    if( Array.isArray(ret)){
      const ret_filter = ret.filter( item => String(item).includes('.php') ? null : item ).filter( item => item );
      if( ret_filter.length > 0 )
        setPlugins(ret_filter);
    }
    
  }

  async function test(){
    
    // console.log('test');
    // const response = await playground.listFiles("/wordpress/wp-content/plugins/absolute-reviews-s1KZjfh8-1716526237");
    // console.log("response", response); 
    
    // 可以通过
    await reload();
  }

  async function reload( url = null )
  {
    setLoading(true);
    if( !url ) url = await playground.getCurrentURL();
    playground.goTo(url);
  }

  function navigator(){
    playground.goTo(url);
  }

  async function openInBlank(){
    // 取得 iframe当前的url
    const path = await playground.getCurrentURL();
    blueprint.landingPage = path;
    // base64 
    const base64 = btoa(JSON.stringify(blueprint));
    const newUrl = `https://playground.wordpress.net/#${base64}`;
    window.open(newUrl, "_blank");
  }

  async function gen()
  {
    if( currentPlugin === '-new-' )
    {
      // 先检查 slug
      // 正则，以字母开头，后续由字母数字下划线和减号组成
      if( ! /^[a-zA-Z][a-zA-Z0-9_-]+$/.test(currentPluginSlug) )
      {
        toast.error('Invalid plugin slug');
        document.getElementById('plugin-slug').focus();
        return false;
      }

      const promptToSend = createPrompt.replace('{{description}}', prompt).replace('{{slug}}', currentPluginSlug);
      
      console.log( promptToSend );

      const openai = new OpenAI({
        apiKey: settings.ai_key,
        baseURL: settings.ai_apibase ? `${settings.ai_apibase}/v1` : null,
        dangerouslyAllowBrowser: true
      });

      const stream = await openai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: promptToSend
          }
        ],
        model: settings.ai_model,
        stream: true
      })
      let content = '';
      const oldChatList = [...chatList];
      oldChatList.push({
        role: 'user',
        content: prompt
      });
      oldChatList.push({
        role: 'assistant',
        content: ''
      });
      for await (const chunk of stream) {
        if( chunk?.choices[0] && chunk?.choices[0].delta?.content )
        {
          content += chunk.choices[0].delta.content;
          // 将 chatList 最后一个 item 的 content进行累加
          const lastItem = oldChatList[oldChatList.length - 1];
          if( lastItem )
          {
            lastItem.content = content;
            setChatList(oldChatList);
          }
        }
        
      }
      setPrompt('');
    } 
  }

  return (
    <div className="flex h-screen bp5-dark">
      <div className="w-[400px] border-r border-black flex flex-col">
        <div className="line-1 bg-black h-full flex flex-col">
          <div className="toolbar p-2">
          <ControlGroup >
            {/* <Button onClick={()=>test()}>test</Button> */}
            <HTMLSelect className="w-[200px]" onChange={e=>setCurrentPlugin(e.target.value)} value={currentPlugin}>
              <option value="-new-">Create new Plugin</option>
              {plugins && plugins.length > 0 && plugins.map(
                (item, index) => {
                  return (
                    <option key={index} value={item}>{item}</option>
                  )
                }
              )  }
            </HTMLSelect>
            { currentPlugin === '-new-' ?
            <InputGroup id="plugin-slug" className="w-[180px]" value={currentPluginSlug} onChange={e=>setCurrentPluginSlug(e.target.value)} placeholder="Plugin Slug" />
            : null }
          </ControlGroup>
          </div>
          <div className="chat-col p-2  flex-1 flex flex-col justify-between h-[calc(100vh-300px)]">
            <div className="chat-list-area overflow-y-auto ">
              {chatList && chatList.length > 0 && chatList.map(
                (item, index) => {
                  return (
                    <div key={index} className={`chat-item flex flex-row items-center `+item.role||""}>
                      <MarkdownDiv onWrite={e=>alert(e)}>{item.content?.replace(/<code\s+language="([^"]+)"\s+path="([^"]+)">([\s\S]*?)<\/code>/,(match, language, path, code) => {
                      return `\`\`\`${language} "${path}"\n${code}\n\`\`\``;
                    } )||""}</MarkdownDiv>
                    </div>
                  )
                }
              )  }
            </div>
            <div className="chat-form max-h-[300px] ">
            <TextArea value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder='' fill={true} autoResize={true} className="max-h-[200px]" />
            <div className="flex flex-row items-center justify-between mt-1">
              <div className="left">
                <Button onClick={()=>gen()}>{ currentPlugin === '-new-' ? 'Create' : 'Modify' }</Button>
                <Button className="ml-1" onClick={()=>{
                  if(window.confirm('Are you sure to clear all chat?'))
                  {
                    setChatList([]);
                  }
                }} icon="clean">New Chat</Button>
                </div>
              <div className="right">
                <ButtonGroup>
                  <Button icon="key" minimal={true} onClick={()=>setShowSettingsBox(true)} />
                </ButtonGroup>
              </div>
              
            </div>
            </div>
          </div>
          
        </div>
        {/* <MonacoEditor
          height="100%"
          theme='vs-dark'
          defaultLanguage="javascript"
          defaultValue="// Type your code here..."
        /> */}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="line-1 bg-black p-2 flex flex-row items-center">
          <div className="left flex-1">
          <InputGroup
            placeholder='enter url'
            className="flex-1 mr-1 p-1"
            value={url}
            onChange={(e)=>setUrl(e.target.value)}
          />
          </div>
          <div className="right">
            <ButtonGroup>
              <Button icon="chevron-right" onClick={()=>navigator()} >Go</Button>
              {/* <Button icon="open-application" className="mr-1" onClick={()=>openInBlank()} >Open in new window</Button> */}
          </ButtonGroup>
          </div>
          { loading ? <div className="loading z-50 bg-black bg-opacity-60 fixed top-0 left-0 right-0 bottom-0 flex flex-row items-center justify-center">
            <RiseLoader color='white' />
          </div> : null }

          <Dialog isOpen={showSettingsBox} onClose={()=>setShowSettingsBox(false)} title="Settings">
            <DialogBody>
              <InputGroup placeholder='please enter openai api key' className="mb-1" value={settings.ai_key||""} onChange={(e)=>setSettings({...settings,ai_key:e.target.value})} leftElement={<Button minimal={true} disabled={true} >OpenAI Key</Button>} rightElement={<AnchorButton  href="https://platform.openai.com/playground" target="_blank" icon="document-open" ></AnchorButton>} />
              <InputGroup placeholder='api base' className="mb-1" value={settings.ai_apibase||""} onChange={(e)=>setSettings({...settings,ai_apibase:e.target.value})} leftElement={<Button minimal={true} disabled={true}>API Endpoint</Button>} />
              <InputGroup placeholder='model' className="mb-1" value={settings.ai_model||""} onChange={(e)=>setSettings({...settings,ai_model:e.target.value})} leftElement={<Button minimal={true} disabled={true}>Model</Button>} />
            </DialogBody>
            <DialogFooter>
              <Button onClick={()=>setShowSettingsBox(false)}>Close</Button>
            </DialogFooter>
          </Dialog>
          <Toaster/>
          
          
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
