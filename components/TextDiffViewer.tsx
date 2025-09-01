
import React from 'react';

// A simple implementation of LCS to find the diff
const diff = (oldStr: string, newStr: string): React.ReactNode[] => {
    const oldWords = oldStr.split(/(\s+)/);
    const newWords = newStr.split(/(\s+)/);
    
    // DP table for LCS
    const dp = Array(oldWords.length + 1).fill(0).map(() => Array(newWords.length + 1).fill(0));

    for (let i = 1; i <= oldWords.length; i++) {
        for (let j = 1; j <= newWords.length; j++) {
            if (oldWords[i-1] === newWords[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }

    // Backtrack to build the diff
    const result: React.ReactNode[] = [];
    let i = oldWords.length, j = newWords.length;
    let key = 0;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
            result.unshift(<span key={key++}>{oldWords[i-1]}</span>);
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
            result.unshift(<ins key={key++} className="bg-emerald-100 text-emerald-800 rounded px-1 py-0.5 no-underline">{newWords[j-1]}</ins>);
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j-1] < dp[i-1][j])) {
            result.unshift(<del key={key++} className="bg-red-100 text-red-800 rounded px-1 py-0.5 line-through decoration-red-500/80 no-underline">{oldWords[i-1]}</del>);
            i--;
        }
    }
    return result;
}


interface TextDiffViewerProps {
    oldText: string;
    newText: string;
}

const TextDiffViewer: React.FC<TextDiffViewerProps> = ({ oldText, newText }) => {
    const diffResult = diff(oldText, newText);

    return (
        <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-lg">
            <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed text-slate-700">
                {diffResult}
            </p>
        </div>
    );
};

export default TextDiffViewer;
