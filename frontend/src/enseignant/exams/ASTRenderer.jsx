import React from 'react';

const renderInline = (node, idx) => {
  if (!node) return null;
  if (node.type === 'text') {
    let content = node.text || '';
    let el = content;
    if (node.bold) el = <strong key={idx}>{el}</strong>;
    if (node.italic) el = <em key={idx}>{el}</em>;
    if (node.underline) el = <u key={idx}>{el}</u>;
    return <React.Fragment key={idx}>{el}</React.Fragment>;
  }
  if (node.type === 'link') {
    const children = (node.children || []).map((c, i) => renderInline(c, `${idx}-${i}`));
    return (
      <a key={idx} href={node.href || '#'} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  }
  if (node.type === 'image') {
    return <img key={idx} src={node.src} alt={node.alt || ''} style={{ maxWidth: '100%' }} />;
  }
  // fallback: if node has children, render them
  if (node.children) return node.children.map((c, i) => renderInline(c, `${idx}-${i}`));
  return null;
};

const ASTRenderer = ({ nodes = [] }) => {
  return (
    <div className="ast-renderer">
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'heading':
            const H = `h${Math.min(Math.max(node.level || 1, 1), 6)}`;
            return React.createElement(H, { key: i }, (node.children || []).map((c, ci) => renderInline(c, `${i}-${ci}`)));
          case 'paragraph':
            return <p key={i}>{(node.children || []).map((c, ci) => renderInline(c, `${i}-${ci}`))}</p>;
          case 'list':
            return node.ordered ? (
              <ol key={i}>{(node.items || []).map((it, ii) => <li key={ii}>{(it.children || []).map((c, ci) => renderInline(c, `${i}-${ii}-${ci}`))}</li>)}</ol>
            ) : (
              <ul key={i}>{(node.items || []).map((it, ii) => <li key={ii}>{(it.children || []).map((c, ci) => renderInline(c, `${i}-${ii}-${ci}`))}</li>)}</ul>
            );
          case 'table':
            return (
              <table key={i} className="ast-table">
                <tbody>
                  {(node.rows || []).map((row, ri) => (
                    <tr key={ri}>{(row || []).map((cell, ci) => <td key={ci}>{(cell.children || []).map((c, idx) => renderInline(c, `${i}-${ri}-${ci}-${idx}`))}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            );
          case 'image':
            return <div key={i} className="ast-img-wrap"><img src={node.src} alt={node.alt || ''} style={{ maxWidth: '100%' }} /></div>;
          default:
            return <div key={i}>{node.type}</div>;
        }
      })}
    </div>
  );
};

export default ASTRenderer;
