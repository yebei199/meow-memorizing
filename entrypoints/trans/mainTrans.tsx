import React from 'react';
import ReactDOM from 'react-dom/client';
import TransLine from "@/entrypoints/trans/TransLine.tsx";


export default function main(){
  const targetWord:string = "and";
  replaceReady(targetWord);
  const list1 = document.getElementsByClassName(targetWord)
  let id = '';
  for (let i of list1) {
    id = i.toString() + '1';
    const root = ReactDOM.createRoot(i as HTMLLIElement);
    root.render(<TransLine word={targetWord} key={id}/>);
  }
}

function replaceReady(word:string) {

// 选择要查找和替换的单词
  const targetWord = word;
  const replacementDivContent = "替换内容";

// 创建一个 div 元素来替换目标单词
  const replacementDiv = document.createElement('span');
  replacementDiv.textContent = replacementDivContent;
  replacementDiv.className=`${targetWord}`
  replacementDiv.style.display = "inline-block";
  replacementDiv.style.position = "relative"; // 或 "absolute", "fixed", 根据你的需求选择
  replacementDiv.style.zIndex = "2"; // 设置一个较高的z-index值以确保它显示在其他元素之上


  walk(document.body);

  function walk(node) {
    let child, next;

    switch (node.nodeType) {
      case 1: // Element
      case 9: // Document
      case 11: // Document fragment
        child = node.firstChild;
        while (child) {
          next = child.nextSibling;
          walk(child);
          child = next;
        }
        break;
      case 3: // Text node
        handleText(node);
        break;
    }
  }

  function handleText(textNode) {
    const regex = new RegExp(targetWord, 'g');
    const parent = textNode.parentNode;

    if (regex.test(textNode.nodeValue)) {
      const parts = textNode.nodeValue.split(targetWord);
      parts.forEach((part, index) => {
        if (index > 0) {
          // 插入替换的 div
          parent.appendChild(replacementDiv.cloneNode(true));
        }
        // 插入原始文本的一部分
        parent.appendChild(document.createTextNode(part));
      });
      parent.removeChild(textNode);
    }
  }
}




// 遍历页面中的所有文本节点

