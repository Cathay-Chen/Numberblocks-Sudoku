export function TipBanner() {
  return (
    <section className="panel flex flex-col items-start gap-4 border-2 border-dashed border-sky-300 bg-sky-100/70 p-5 md:flex-row md:items-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-500 text-2xl text-white shadow-md">
        🎓
      </div>
      <div>
        <h3 className="font-display text-2xl leading-tight text-slate-900">提示: Numberblocks 很友好!</h3>
        <p className="mt-1 text-sm text-slate-700">
          每个数字在每一行、每一列和每个 3×3 宫里都只能出现一次。先找缺失的数字。
        </p>
      </div>
    </section>
  );
}
