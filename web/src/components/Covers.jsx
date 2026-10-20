// Hand-drawn chibi covers (front-facing, sitting). Owner side = Corgi 柯基, walker side = German Shepherd 德國牧羊犬.
// Each dog is built from continuous silhouette paths with one shared outline colour so it reads as one illustration.

const LINE = '#6B4A33';
const line = { stroke: LINE, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' };

export function CorgiCover({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 400 350" role="img" aria-label="坐著微笑、繫著藍色領巾的柯基">
      <defs>
        <radialGradient id="cg-fur" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#F6B46E" /><stop offset="1" stopColor="#E28E43" /></radialGradient>
        <linearGradient id="cg-cream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFDF8" /><stop offset="1" stopColor="#F5E6CF" /></linearGradient>
      </defs>
      <ellipse cx="200" cy="334" rx="120" ry="12" fill="#5B7A8C" opacity=".14" />
      {/* back feet peeking out */}
      <path d="M112 318c-6-18 8-30 26-26 14 3 16 22 4 30-10 6-26 4-30-4z" fill="#E28E43" {...line} />
      <path d="M288 318c6-18-8-30-26-26-14 3-16 22-4 30 10 6 26 4 30-4z" fill="#E28E43" {...line} />
      {/* body */}
      <path d="M146 192c-26 26-40 70-34 108 4 22 26 30 52 30h72c26 0 48-8 52-30 6-38-8-82-34-108z" fill="url(#cg-fur)" {...line} />
      {/* fluffy chest */}
      <path d="M160 196c-14 30-14 70 6 98 14 20 54 20 68 0 20-28 20-68 6-98-8 10-14 14-20 12-6 8-14 10-20 10s-14-2-20-10c-6 2-12-2-20-12z" fill="url(#cg-cream)" />
      {/* front legs */}
      <path d="M166 282c-2 18-2 34 2 44 4 8 26 8 28 0 2-12 2-28 0-44z" fill="#FFF8EC" {...line} />
      <path d="M234 282c2 18 2 34-2 44-4 8-26 8-28 0-2-12-2-28 0-44z" fill="#FFF8EC" {...line} />
      <path d="M176 326v-8M186 326v-8M214 326v-8M224 326v-8" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      {/* bandana */}
      <path d="M146 196c34 18 74 18 108 0l-16 40c-18 22-58 22-76 0z" fill="#6E93AA" {...line} />
      <circle cx="200" cy="232" r="9" fill="#E6CF86" stroke={LINE} strokeWidth="3" />
      {/* ears */}
      <path d="M126 116c-14-36-14-74-2-98 4-6 10-6 16-2 22 18 40 42 48 60z" fill="#E28E43" {...line} />
      <path d="M138 98c-6-22-6-44 0-60 14 12 26 28 32 40z" fill="#F6B7A6" />
      <path d="M274 116c14-36 14-74 2-98-4-6-10-6-16-2-22 18-40 42-48 60z" fill="#E28E43" {...line} />
      <path d="M262 98c6-22 6-44 0-60-14 12-26 28-32 40z" fill="#F6B7A6" />
      {/* head with fluffy cheeks */}
      <path d="M200 60c56 0 94 36 94 80 0 16-6 30-16 40 4 8 2 16-6 18-20 14-46 20-72 20s-52-6-72-20c-8-2-10-10-6-18-10-10-16-24-16-40 0-44 38-80 94-80z" fill="url(#cg-fur)" {...line} />
      {/* white blaze + muzzle */}
      <path d="M200 76c-8 22-12 40-28 60-20 22-12 62 28 64 40-2 48-42 28-64-16-20-20-38-28-60z" fill="url(#cg-cream)" />
      {/* blush */}
      <ellipse cx="146" cy="170" rx="15" ry="9" fill="#F49A8C" opacity=".5" />
      <ellipse cx="254" cy="170" rx="15" ry="9" fill="#F49A8C" opacity=".5" />
      {/* eyes */}
      <ellipse cx="164" cy="142" rx="12" ry="14" fill="#2B211C" />
      <ellipse cx="236" cy="142" rx="12" ry="14" fill="#2B211C" />
      <circle cx="168" cy="136" r="4.5" fill="#fff" /><circle cx="160" cy="148" r="2" fill="#fff" />
      <circle cx="240" cy="136" r="4.5" fill="#fff" /><circle cx="232" cy="148" r="2" fill="#fff" />
      {/* nose, smile, tongue */}
      <path d="M187 164c0-7 26-7 26 0 0 8-8 13-13 13s-13-5-13-13z" fill="#2B211C" />
      <ellipse cx="195" cy="163" rx="4" ry="2" fill="#fff" opacity=".45" />
      <path d="M194 188c0 12 12 12 12 0z" fill="#F08A8A" stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M200 177c0 8-6 12-13 9M200 177c0 8 6 12 13 9" fill="none" stroke={LINE} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export function ShepherdCover({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 400 350" role="img" aria-label="坐得挺挺、戴著項圈的德國牧羊犬">
      <defs>
        <radialGradient id="gs-tan" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#E2A868" /><stop offset="1" stopColor="#C0813F" /></radialGradient>
        <linearGradient id="gs-chest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F1C590" /><stop offset="1" stopColor="#E0A866" /></linearGradient>
        <linearGradient id="gs-black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A3E38" /><stop offset="1" stopColor="#2C2420" /></linearGradient>
      </defs>
      <ellipse cx="200" cy="334" rx="130" ry="12" fill="#5B7A8C" opacity=".14" />
      {/* bushy tail curling round the side */}
      <path d="M256 318c46 6 72-16 78-52 2-16 24-18 26 0 6 50-36 82-100 72z" fill="url(#gs-tan)" {...line} />
      <path d="M312 300c14-10 22-24 24-42 6-8 20-6 22 6 2 20-12 38-34 46z" fill="url(#gs-black)" />
      {/* back feet */}
      <path d="M108 318c-6-18 8-30 26-26 14 3 16 22 4 30-10 6-26 4-30-4z" fill="#C0813F" {...line} />
      <path d="M292 318c6-18-8-30-26-26-14 3-16 22-4 30 10 6 26 4 30-4z" fill="#C0813F" {...line} />
      {/* body with black saddle on the shoulders */}
      <path d="M144 190c-28 26-42 72-36 110 4 22 26 30 52 30h80c26 0 48-8 52-30 6-38-8-84-36-110z" fill="url(#gs-tan)" {...line} />
      <path d="M146 194c-22 22-34 56-34 88 12-8 22-30 30-56 6-14 14-24 24-30z" fill="url(#gs-black)" />
      <path d="M254 194c22 22 34 56 34 88-12-8-22-30-30-56-6-14-14-24-24-30z" fill="url(#gs-black)" />
      {/* chest */}
      <path d="M164 198c-14 30-14 72 6 100 14 20 46 20 60 0 20-28 20-70 6-100z" fill="url(#gs-chest)" />
      {/* front legs (longer than the corgi's) */}
      <path d="M166 262c-2 26-2 48 2 64 4 8 26 8 28 0 2-16 2-38 0-64z" fill="#E6B377" {...line} />
      <path d="M234 262c2 26 2 48-2 64-4 8-26 8-28 0-2-16-2-38 0-64z" fill="#E6B377" {...line} />
      <path d="M176 326v-8M186 326v-8M214 326v-8M224 326v-8" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      {/* collar + tag */}
      <path d="M156 222c30 18 58 18 88 0" fill="none" stroke="#5F86A0" strokeWidth="12" strokeLinecap="round" />
      <circle cx="200" cy="246" r="10" fill="#E6CF86" stroke={LINE} strokeWidth="3" />
      {/* tall pointed ears */}
      <path d="M130 118c-14-40-12-80 0-104 4-6 10-6 14-2 24 22 40 52 44 76z" fill="url(#gs-black)" {...line} />
      <path d="M142 100c-6-26-6-50 2-68 14 16 24 36 28 52z" fill="#D9A06A" />
      <path d="M270 118c14-40 12-80 0-104-4-6-10-6-14-2-24 22-40 52-44 76z" fill="url(#gs-black)" {...line} />
      <path d="M258 100c6-26 6-50-2-68-14 16-24 36-28 52z" fill="#D9A06A" />
      {/* head: rounder skull, gentle snout */}
      <path d="M200 66c52 0 88 34 88 76 0 22-12 40-30 52-10 20-30 32-58 32s-48-12-58-32c-18-12-30-30-30-52 0-42 36-76 88-76z" fill="url(#gs-tan)" {...line} />
      {/* black mask and forehead stripe */}
      <path d="M200 70c-6 14-10 30-12 44 4 0 8 2 12 6 4-4 8-6 12-6-2-14-6-30-12-44z" fill="#3A302B" />
      <path d="M200 118c-16 10-34 30-38 54-4 24 14 50 38 52 24-2 42-28 38-52-4-24-22-44-38-54z" fill="url(#gs-black)" />
      {/* lighter muzzle tip */}
      <path d="M176 196c6 16 14 24 24 24s18-8 24-24c-8 4-16 6-24 6s-16-2-24-6z" fill="#D9A06A" />
      {/* tan eyebrow pips */}
      <ellipse cx="160" cy="120" rx="9" ry="5" fill="#F1C590" />
      <ellipse cx="240" cy="120" rx="9" ry="5" fill="#F1C590" />
      {/* eyes */}
      <ellipse cx="163" cy="142" rx="11" ry="13" fill="#3A2416" />
      <ellipse cx="237" cy="142" rx="11" ry="13" fill="#3A2416" />
      <circle cx="167" cy="136" r="4.2" fill="#fff" /><circle cx="159" cy="148" r="1.8" fill="#fff" />
      <circle cx="241" cy="136" r="4.2" fill="#fff" /><circle cx="233" cy="148" r="1.8" fill="#fff" />
      <ellipse cx="146" cy="172" rx="13" ry="8" fill="#F49A8C" opacity=".4" />
      <ellipse cx="254" cy="172" rx="13" ry="8" fill="#F49A8C" opacity=".4" />
      {/* nose, smile, tongue */}
      <path d="M185 176c0-8 30-8 30 0 0 9-9 15-15 15s-15-6-15-15z" fill="#15110F" />
      <ellipse cx="194" cy="175" rx="5" ry="2.4" fill="#fff" opacity=".4" />
      <path d="M193 206c0 16 14 16 14 0z" fill="#F08A8A" stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M200 191c0 9-7 14-15 11M200 191c0 9 7 14 15 11" fill="none" stroke="#F1C590" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
