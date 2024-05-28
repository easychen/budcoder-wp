import React, { useRef, useEffect, useState, useMemo } from 'react';
// import MonacoEditor from '@monaco-editor/react';
import { startPlaygroundWeb } from '@wp-playground/client';
import { Button, InputGroup, ButtonGroup, TextArea, Dialog, DialogBody, DialogFooter, AnchorButton, ControlGroup, HTMLSelect } from '@blueprintjs/core';
import RiseLoader from 'react-spinners/RiseLoader';
import useLocalStorageState from 'use-local-storage-state';
import { createPrompt, modifyPrompt } from './prompt';
import OpenAI from 'openai';
import MarkdownDiv from './MarkdownDiv';
import toast, { Toaster } from 'react-hot-toast';
let playground = null;

const App = () => {
  const iframeRef = useRef(null);
  // 从 query 中获取插件地址
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang') || '中文';

  // const [url, setUrl] = useState('/wp-admin/plugins.php');
  const pure_plugin = params.get('plugin') ? params.get('plugin').split('/')[0] : '';
  const defaultUrl = params.get('plugin') ? `/wp-admin/plugin-editor.php?file=${encodeURIComponent(params.get('plugin'))}&plugin=${encodeURIComponent(params.get('plugin'))}` : '/wp-admin/plugins.php';

  const [url, setUrl] = useState(defaultUrl);
  const [prompt, setPrompt] = useState(params.get('prompt') || 'Please add a field in the backend article list to display the number of times each article has been read.');

  const [pluginCreatePrompt, setPluginCreatePrompt] = useLocalStorageState('pluginCreatePrompt', {
    defaultValue: createPrompt,
  });

  const [showPathInput, setShowPathInput] = useState(false);
  const [pathInfo, setPathInfo] = useState(false);

  const [pluginModifyPrompt, setPluginModifyPrompt] = useLocalStorageState('pluginModifyPrompt', {
    defaultValue: modifyPrompt,
  });

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

  const [showAdvancedSettings, setShowAdvancedSettings] = useLocalStorageState('showAdvancedSettings', {
    defaultValue: false,
  });

  const [streamText, setStreamText] = useState('');

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
    ],
  };

  // localhost是本地测试环境，不加载 wp-plugin-exporter(因为路径不对)
  // 改为必须传入 export 参数才自动安装
  if( window.location.hostname != 'localhost' && params.get('export') == 1 )
  {
    blueprint.steps.push(//
    {
      step: 'installPlugin',
      pluginZipFile: {
        resource: 'url',
        url: `${window.origin}/wp-json/pebc/v1/get-file/preset/wp-plugin-exporter.zip`
      },
      "options": {
        "activate": true
      }
    });
  }

  if (params.get('path')) {
    // 从 path 中提取 rand 和 plugin
    // 使用 正则 /zip\/(.+?)\/(.+?)\.zip/g
    const match = params.get('path').match(/zip\/(.+?)\/(.+?)\.zip/);
    if (match) {
      const rand = match[1];
      const plugin_name = match[2];

      blueprint.steps.push({
        step: 'installPlugin',
        pluginZipFile: {
          resource: 'url',
          // http://dd.ftqq.com//wp-json/pebc/v1/get-file?rand=yIge0aSl&plugin=fangconnect
          url: `${window.origin}/wp-json/pebc/v1/get-file/${rand}/${plugin_name}.zip`
          // url: window.origin +'/wp-content/plugins/plugin-editor-by-bud-coder/'+ params.get('path')
        },
      });
    }

  }else
  {
    // 测试时载入
    // blueprint.steps.push({
    //   step: 'installPlugin',
    //   pluginZipFile: {
    //     resource: 'url',
    //     url: window.origin +'/kodo-qiniu.zip'
    //   },
    // });
  }

  useEffect(() => {
    const loadPlayground = async () => {
      const client = await startPlaygroundWeb({
        iframe: iframeRef.current,
        remoteUrl: 'https://playground.wordpress.net/remote.html',
        blueprint
      });
      await client.isReady();
      client.onNavigation(path => {
        // 从 path 中提取 plugin=encoded_name
        const params = new URLSearchParams(path.split('?')[1]);

        if (params.get('plugin')) {
          const decodedName = params.get('plugin');
          if (decodedName)
            setCurrentPlugin(decodedName);
        }
        setUrl(path);
        setLoading(false);
      });
      client.goTo(url);
      playground = client;
      loadPlugins();
    };
    loadPlayground()
    checkSettings();
  }, []);

  function checkSettings() {
    if (!settings.ai_key) {
      toast("Please set the AI key first.");
      setShowSettingsBox(true);
    }
  }

  async function loadPlugins() {
    const response = await playground.run({
      code: `<?php 
      require("/wordpress/wp-load.php"); 
      require_once('/wordpress/wp-admin/includes/plugin.php');
      echo json_encode(array_keys(get_plugins()));
      `
    });
    if( Array.isArray(response.json) && response.json.length > 0 )
    {
      // load plugins from response.json
      setPlugins(response.json);
      return response.json;
    }
      
  }

  async function test() {

    // console.log('test');
    // const response = await playground.listFiles("/wordpress/wp-content/plugins/absolute-reviews-s1KZjfh8-1716526237");
    // console.log("response", response); 

    // 可以通过
    await reload();
  }

  async function reload(url = null) {
    setLoading(true);
    if (!url) url = await playground.getCurrentURL();
    playground.goTo(url);
  }

  function navigator() {
    playground.goTo(url);
  }

  async function openInBlank() {
    // 取得 iframe当前的url
    const path = await playground.getCurrentURL();
    blueprint.landingPage = path;
    // base64 
    const base64 = btoa(JSON.stringify(blueprint));
    const newUrl = `https://playground.wordpress.net/#${base64}`;
    window.open(newUrl, "_blank");
  }

  async function writeFile(path, content) {

    if( !path || path.length < 1 )
    {
      if( currentPlugin == '-new-' )
      {
        setPathInfo({
          path:`${currentPluginSlug}/${currentPluginSlug}.php`,
          content
        });
      }else
      {
        let thePath =  `${currentPlugin}`;
        // 如果右侧打开了文件编辑器，那么写入到打开的文件
        const url = await playground.getCurrentURL();
        if( url && String(url).startsWith('/wp-admin/plugin-editor.php') )
        {
          const params = new URLSearchParams(url.split('?')[1]);
          if( params.get('file') ) thePath = file;
        }

        setPathInfo({
          path:thePath,
          content
        });
      }
      setShowPathInput(true);
      return false;
    }

    const pathInfo = path.split('/');
    // 兼容只有一个文件的插件
    if( pathInfo[0] == pathInfo[1] && String(pathInfo[0]).endsWith('.php') ) path = pathInfo[0];

    console.log( "writeFile path 2", path  );
    // return false;
    if (!playground) {
      toast.error('Playground not ready');
      return false;
    }
    const filePath = `/wordpress/wp-content/plugins/${path}`;
    const fileDir = filePath.split('/').slice(0, -1).join('/');

    console.log("fileDir", fileDir, "filePath", filePath);

    await playground.mkdir(fileDir, { recursive: true });
    await playground.writeFile(filePath, content);

    const instantPlugins = await loadPlugins();

    // 从 plugins 中获取 plugin 的完整路径
    const pluginPath = path.split('/')[0];
    const pluginFullPath = instantPlugins.find(item => item.includes(pluginPath));
    if( !pluginFullPath )
    {
      console.log( "error", pluginPath, instantPlugins, pluginFullPath )
      return false;
    }
    
    const newUrl = `/wp-admin/plugin-editor.php?plugin=${encodeURIComponent(pluginFullPath)}&file=${encodeURIComponent(path)}&Submit=Select`;

    // /wp-admin/plugin-editor.php?file=wp-article-counter%2Fwp-article-counter.php&plugin=wp-article-counter%2Fwp-article-counter.php

    // const newUrl = `/wp-admin/plugin-editor.php?plugin=${encodeURIComponent(currentPluginSlug+'/'+path)}&Submit=Select`;

    // /wp-admin/plugin-editor.php?plugin=wp-article-counter%2Fwp-article-counter.php&Submit=Select
    setLoading(true);
    await playground.goTo(newUrl);
    await loadPlugins();

  }

  async function gen() {
    let promptToSend = '';
    if (currentPlugin === '-new-') {
      // 先检查 slug
      // 正则，以字母开头，后续由字母数字下划线和减号组成
      if (! /^[a-zA-Z][a-zA-Z0-9_-]+$/.test(currentPluginSlug)) {
        toast.error('Invalid plugin slug.');
        document.getElementById('plugin-slug').focus();
        return false;
      }

      promptToSend = pluginCreatePrompt.replace(/{{description}}/g, prompt).replace(/{{slug}}/g, currentPluginSlug).replace(/{{lang}}/g, lang);
    } else {
      // 修改模式
      // 需要补充
      // slug / file / code 
      // 通过 playground 获取
      const currentPath = await playground.getCurrentURL();
      const params = new URLSearchParams(currentPath.split('?')[1]);
      const plugin_name = params.get('plugin');
      const file_name = params.get('file') || plugin_name;
      if (!plugin_name || !file_name) {
        toast("Please select a file in the Plugin editor first.");
        return false;
      }
      console.log("currentPath", currentPath, file_name);

      // splite / 以后，第一个元素为 插件 slug
      const plugin_slug = plugin_name.split('/')[0];
      // 剩下的元素（第二个到最后的元素）重新拼接为插件内路径
      const file_content = await playground.readFileAsText('/wordpress/wp-content/plugins/' + file_name);
      if (!file_content) {
        toast.error('Failed to get file content.');
        return false;
      }

      promptToSend = pluginModifyPrompt.replace(/{{description}}/g, prompt).replace(/{{slug}}/g, plugin_slug).replace(/{{file}}/g, file_name).replace(/{{code}}/g, file_content).replace(/{{lang}}/g, lang);
    }

    if (promptToSend === '') {
      toast.error('The prompt is empty.');
      return false;
    }

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
    
    for await (const chunk of stream) {
      if (chunk?.choices[0] && chunk?.choices[0].delta?.content) {
        content += chunk.choices[0].delta.content;
        setStreamText(content);
        // .chat-list-area 滚动到 bottom
        const chatListArea = document.querySelector('.chat-list-area');
        chatListArea.scrollTop = chatListArea.scrollHeight;
        // 
        // 将 chatList 最后一个 item 的 content进行累加
        // const lastItem = oldChatList[oldChatList.length - 1];
        // if (lastItem) {
        //   lastItem.content = content;
        //   setChatList(oldChatList);
        // }
      }

    }
    setPrompt('');
    setStreamText('');
    setChatList([...oldChatList, {
      role: 'assistant',
      content: content
    }]);
  }

  return (
    <div className="flex h-screen bp5-dark">
      <div className="w-[400px] border-r border-black flex flex-col">
        <div className="line-1 bg-black h-full flex flex-col">
          <div className="toolbar p-2">
            <ControlGroup >
              {/* <Button onClick={()=>test()}>test</Button> */}
              <HTMLSelect className="w-[200px]" onChange={async e => {
                setCurrentPlugin(e.target.value)
                // if (e.target.value !== '-new-') {

                //   // /wp-admin/plugin-editor.php?plugin=absolute-reviews-s1KZjfh8-1716526237%2Fabsolute-reviews-s1KZjfh8-1716526237.php&Submit=Select


                //   await playground.goTo(`/wp-admin/plugin-editor.php?plugin=${encodeURIComponent(e.target.value)}&Submit=Select`);
                // }
              }} value={currentPlugin}>
                <option value="-new-">Create new Plugin</option>
                {plugins && plugins.length > 0 && plugins.map(
                  (item, index) => {
                    return (
                      <option key={index} value={item}>{item}</option>
                    )
                  }
                )}
              </HTMLSelect>
              {currentPlugin === '-new-' ?
                <InputGroup id="plugin-slug" className="w-[180px]" value={currentPluginSlug} onChange={e => setCurrentPluginSlug(e.target.value)} placeholder="Plugin Slug" />
                : <Button className="ml-1" onClick={async ()=>{
                  await playground.goTo(`/wp-admin/plugin-editor.php?plugin=${encodeURIComponent(currentPlugin)}&Submit=Select`);
                }}>Go</Button>}
            </ControlGroup>
          </div>
          <div className="chat-col p-2  flex-1 flex flex-col justify-between h-[calc(100vh-300px)]">
            <div className="chat-list-area overflow-y-auto ">
              {chatList && chatList.length > 0 && chatList.map(
                (item, index) => {
                  return (
                    <div key={index} className={`chat-item flex flex-row items-center ` + item.role || ""}>
                      <MarkdownDiv onWrite={(path, content) => writeFile(path, content)}>{item.content?.replace(/<code\s+language="([^"]+)"\s+path="([^"]+)">([\s\S]*?)<\/code>/g, (match, language, path, code) => {
                        return `\`\`\`${language} ${path}\n${code}\n\`\`\``;
                      }) || ""}</MarkdownDiv>
                    </div>
                  )
                }
              )}
              {streamText && streamText.length > 0 ? <div className="chat-item flex flex-row items-center empty:hidden">
              <MarkdownDiv>{streamText}</MarkdownDiv>
              </div> : null}
              
            </div>
            <div className="chat-form max-h-[300px] ">
              <TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder='' fill={true} autoResize={true} className="max-h-[200px]" />
              <div className="flex flex-row items-center justify-between mt-1">
                <div className="left flex flex-row items-center">
                  <Button onClick={() => gen()}>{currentPlugin === '-new-' ? 'Create' : 'Modify'}</Button>
                  <Button className="ml-1" onClick={() => {
                    if (window.confirm('Are you sure you want to clear all chat?')) {
                      setChatList([]);
                    }
                  }} icon="clean">Clean Chat</Button>
                  <span className="uppercase text-slate-400 ml-2 text-opacity-30 ">{lang}</span>
                </div>
                <div className="right">
                  <ButtonGroup>
                    <Button icon="settings" minimal={true} onClick={() => setShowSettingsBox(true)} />
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
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="right">
            <ButtonGroup>
              <Button icon="chevron-right" onClick={() => navigator()} >Go</Button>
              {/* <Button icon="open-application" className="mr-1" onClick={()=>openInBlank()} >Open in new window</Button> */}
            </ButtonGroup>
          </div>
          {loading ? <div className="loading z-50 bg-black bg-opacity-60 fixed top-0 left-0 right-0 bottom-0 flex flex-row items-center justify-center">
            <RiseLoader color='white' />
          </div> : null}

          <Dialog isOpen={showSettingsBox} onClose={() => setShowSettingsBox(false)} title="Settings">
            <DialogBody>
            <div className="mb-2 bg-slate-200 p-3 rounded">
              <InputGroup type="password" placeholder='Please enter the OpenAI API key' className="mb-1" value={settings.ai_key || ""} onChange={(e) => setSettings({ ...settings, ai_key: e.target.value })} leftElement={<Button minimal={true} disabled={true} >OpenAI Key</Button>} rightElement={<AnchorButton href="https://platform.openai.com/playground" target="_blank" icon="document-open" ></AnchorButton>} />
              <InputGroup placeholder='API base' className="mb-1" value={settings.ai_apibase || ""} onChange={(e) => setSettings({ ...settings, ai_apibase: e.target.value })} leftElement={<Button minimal={true} disabled={true}>API Endpoint</Button>} />
              <InputGroup placeholder='Chat Model' className="mb-1" value={settings.ai_model || ""} onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })} leftElement={<Button minimal={true} disabled={true}>Model</Button>} />
              </div>
              <Button icon={showAdvancedSettings?'chevron-up':'chevron-down'} onClick={()=>setShowAdvancedSettings(!showAdvancedSettings)}>Prompts</Button>
              { showAdvancedSettings ? <div className="mt-2 bg-slate-200 p-3 rounded">
                <div className="text-md my-1">Create Plugin Prompt</div>
                <TextArea fill={true} className="max-h-[20vh]" autoResize={true} value={pluginCreatePrompt} onChange={e=>setPluginCreatePrompt(e.target.value)} />
                <div className="text-md my-1">Modify Plugin Prompt</div>
                <TextArea fill={true} className="max-h-[20vh]" autoResize={true} value={pluginModifyPrompt} onChange={e=>setPluginModifyPrompt(e.target.value)} />
                
              </div> : null }
              
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setShowSettingsBox(false)}>Close</Button>
            </DialogFooter>
          </Dialog>
          <Dialog isOpen={showPathInput} onClose={() => setShowPathInput(false)} title="File Path">
            <DialogBody>
              <InputGroup placeholder='Please enter the path' className="mb-1" value={pathInfo.path||""} onChange={(e) => setPathInfo({...pathInfo,path:e.target.value})} />
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => {
                setShowPathInput(false);
                writeFile(pathInfo.path, pathInfo.content);
              }}>Write</Button>
            </DialogFooter>
          </Dialog>
          <Toaster />


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
