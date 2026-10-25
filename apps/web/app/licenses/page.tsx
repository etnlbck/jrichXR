import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import styles from './licenses.module.css';

export const metadata: Metadata = {
  title: 'Licenses — JRichForms XR',
};

async function engineLicense(): Promise<string | null> {
  try {
    return await readFile(path.join(process.cwd(), 'public/xr/engine/LICENSE'), 'utf8');
  } catch {
    return null;
  }
}

const OPEN_SOURCE = [
  {
    name: 'three.js',
    license: 'MIT License',
    notice: 'Copyright © 2010-2021 three.js authors.',
  },
  {
    name: 'Draco 3D decoder',
    license: 'Apache License 2.0',
    notice: 'Copyright Google LLC.',
  },
  {
    name: 'Camera canvas sizing, adapted from XRExtras',
    license: 'MIT License',
    notice: 'Copyright 2026 Niantic Spatial, Inc.',
  },
];

export default async function LicensesPage() {
  const license = await engineLicense();
  return (
    <main className={styles.page}>
      <h1>Licenses</h1>

      <section>
        <h2>XR engine</h2>
        <p>
          The AR experience uses the XR Engine software created by Niantic Spatial, Inc.
          Copyright © 2026 Niantic Spatial, Inc. All rights reserved.
        </p>
        <p>
          The XR engine is licensed under the Niantic Spatial XR Engine License
          Agreement, reproduced below. It is provided “as is”, without warranties of
          any kind; see section 4 (Disclaimers) of the agreement.
        </p>
        <p>
          This site is not affiliated with, sponsored or endorsed by Niantic Spatial.
        </p>
        {license ? (
          <pre className={styles.licenseText}>{license}</pre>
        ) : (
          <p>
            <a href="/xr/engine/LICENSE">Read the XR Engine License Agreement</a>
          </p>
        )}
      </section>

      <section>
        <h2>Open-source software</h2>
        <ul className={styles.list}>
          {OPEN_SOURCE.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong> — {item.license}. {item.notice}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
