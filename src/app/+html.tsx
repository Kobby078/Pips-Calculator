import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { SETTINGS_STORAGE_KEY } from '@/lib/lot-settings';

/** Runs before paint so a saved appearance does not wait for hydration. */
const themeBoot = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)});var appearance='system';if(raw){var parsed=JSON.parse(raw);if(parsed&&(parsed.appearance==='light'||parsed.appearance==='dark'||parsed.appearance==='system')){appearance=parsed.appearance;}}var systemDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=appearance==='dark'||(appearance!=='light'&&systemDark)?'dark':'light';document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(e){}})();`;

export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
