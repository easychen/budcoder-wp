import ReactMarkdown from 'react-markdown';
// import ModalImage from "react-modal-image";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import gfm from 'remark-gfm';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { toast } from 'react-hot-toast';
import React, { memo } from 'react';

//@ts-ignore
export default function MarkdownDiv({ children, onWrite }) {
    //@ts-ignore
    function CustomLink({ href, ...props }) {
        // Check if the href starts with 'http'
        if (href.startsWith('http')) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}/>
            );
        }
    }

    return <ReactMarkdown
        remarkPlugins={[gfm]}
        className="markdown-block"
        children={typeof children === 'string' ? children : ''}
        // rehypePlugins={[[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]]}
        components={{
            // @ts-ignore
            code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <div className="code-box my-2 group">
                    <SyntaxHighlighter
                        children={String(children).replace(/\n$/, '').replace(/^\n/, '')}
                        // @ts-ignore
                        style={okaidia}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                    />
                    <CopyToClipboard text={String(children)} onCopy={()=>toast.success('Copied')}><Button icon="code">Copy</Button></CopyToClipboard>
                    
                    <Button className="ml-2" icon="input" onClick={()=>{
                        // @ts-ignore
                        if( onWrite ) onWrite(node?.data?.meta||"", String(children).replace(/\n$/, '').replace(/^\n/, ''));
                    }}>Write</Button> 
                    </div>
                ) : (
                    <code className={className} {...props}>
                        {children}
                    </code>
                )
            },
            // @ts-ignore
            p: ({ children }) => <div>{children}</div>,
            // 编写一个处理href的组件，将所有http开头的链接都转换为新窗口打开；所有非http开头的链接都转换为 nav(...)
            //@ts-ignore
            a: CustomLink,
        }
        }
    />;
}

