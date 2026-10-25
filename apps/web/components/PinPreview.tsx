import type { Ref } from 'react';
import styles from './PinPreview.module.css';

type Props = {
  pinId: string;
  title: string;
  body: string;
  audioUrl: string | null;
  ref?: Ref<HTMLDivElement>;
};

/** The selected pin as visitors see it when they tap it in AR. */
export default function PinPreview({ pinId, title, body, audioUrl, ref }: Props) {
  return (
    <div ref={ref} className={styles.wrap}>
      <span className={styles.caption}>Visitor preview</span>
      <div className={styles.card}>
        <h2 className={title ? undefined : styles.untitled}>
          {title || 'Untitled pin'}
        </h2>
        {body ? <p className={styles.body}>{body}</p> : null}
        {audioUrl ? (
          <audio
            key={`${pinId}:${audioUrl}`}
            className={styles.audio}
            controls
            preload="none"
            src={audioUrl}
          />
        ) : null}
      </div>
    </div>
  );
}
