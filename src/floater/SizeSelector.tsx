import { FLOATER_SIZE_LABELS, type FloaterSize } from '../../shared/types';

const ORDER: FloaterSize[] = ['small', 'medium', 'large'];

interface Props {
  current: FloaterSize;
  onChange: (size: FloaterSize) => void;
}

export default function SizeSelector({ current, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-ink-100/80 rounded-md p-[2px]">
      {ORDER.map((s) => {
        const active = s === current;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`text-[10px] leading-none px-1.5 py-[3px] rounded transition ${
              active
                ? 'bg-white text-gold-700 shadow-sm font-medium'
                : 'text-ink-500 hover:text-ink-700'
            }`}
            title={`${FLOATER_SIZE_LABELS[s]}尺寸`}
          >
            {FLOATER_SIZE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
