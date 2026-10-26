import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession, useData, petAge } from '../../lib.jsx';
import { api, assetUrl } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, PetAvatar } from '../../components/ui.jsx';

const BLANK = { name: '', type: '犬', breed: '', birth: '', sex: '公', neuter: '已結紮', weight: '', chip_last4: '', vaccine: '已依建議接種', energy: '活潑好動', social: '可友善互動', leash: '一般牽繩', intro: '', medical: '', emergency: '', clinic: '' };
const OPTS = {
  type: ['犬', '貓', '其他'], sex: ['公', '母'], neuter: ['已結紮', '未結紮'], vaccine: ['已依建議接種', '接種待確認', '未接種'],
  energy: ['活潑好動', '一般', '溫和慢步'], social: ['可友善互動', '容易緊張', '需保持距離'], leash: ['一般牽繩', '胸背帶', '胸背帶／雙重牽繩', 'P 繩／雙重牽繩'],
};

export default function OwnerPets() {
  const { owner, notify, refresh } = useSession();
  const [pets, reload] = useData(`/owners/${owner.id}/pets`);
  const [form, setForm] = useState(BLANK);
  const [photo, setPhoto] = useState(null);
  const [me, setMe] = useState(owner);
  useEffect(() => { if (pets && !form.id && !form.name && pets[0]) setForm(pets[0]); }, [pets]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, owner_id: owner.id, weight: Number(form.weight) || null };
    const saved = form.id ? await api.put(`/pets/${form.id}`, body) : await api.post('/pets', body);
    if (photo) { const fd = new FormData(); fd.append('photo', photo); Object.assign(saved, await api.post(`/pets/${saved.id}/photo`, fd)); setPhoto(null); }
    setForm(saved); reload(); notify(`${saved.name} 的檔案已儲存到資料庫。`);
  };
  const remove = async (p) => {
    if (!window.confirm(`確定刪除「${p.name}」？`)) return;
    try { await api.del(`/pets/${p.id}`); setForm(BLANK); reload(); notify('已刪除。'); } catch (err) { notify(err.message); }
  };
  const saveMe = async (e) => { e.preventDefault(); await api.put(`/users/${owner.id}`, me); refresh(); notify('飼主資料已更新。'); };

  return (
    <>
      <PageHead eyebrow="Owner profile & pet identity" title="我的毛孩與飼主資料 🐾" sub="先建立照護需求，再為毛孩發起任務；遛狗者只會看到履行任務所需的資訊。">
        <button className="btn primary" onClick={() => setForm(BLANK)}><Icon name="paw" size={16} />新增毛孩</button>
      </PageHead>
      <div className="grid split-r">
        <div className="stack">
          <Card className="pad">
            <SectionHead title={`毛孩清單（${pets?.length ?? 0}）`} />
            <div className="list">
              {(pets || []).map((p) => (
                <div key={p.id} className={`item ${form.id === p.id ? 'selected' : ''}`}>
                  <PetAvatar pet={p} size={58} />
                  <div className="item-main">
                    <div className="item-title">{p.name}</div>
                    <div className="item-sub">{p.breed} · {petAge(p)} · {p.sex} · {p.weight ?? '–'}kg</div>
                    <div className="chips mt-s"><span className="chip gold">{p.energy}</span><span className={`chip ${p.social === '可友善互動' ? '' : 'red'}`}>{p.social}</span></div>
                  </div>
                  <div className="stack" style={{ gap: 6 }}>
                    <button className="btn soft sm" onClick={() => setForm(p)}>編輯</button>
                    <Link className="btn ghost sm" to={`/owner/book?pet=${p.id}`}>預約</Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="飼主介紹" sub="讓遛狗者了解你與毛孩的生活習慣" />
            <form className="form-grid" onSubmit={saveMe}>
              <label className="field"><span>名稱</span><input value={me.name || ''} onChange={(e) => setMe({ ...me, name: e.target.value })} /></label>
              <label className="field"><span>常用地區</span><input value={me.district || ''} onChange={(e) => setMe({ ...me, district: e.target.value })} /></label>
              <label className="field"><span>Email</span><input value={me.email || ''} onChange={(e) => setMe({ ...me, email: e.target.value })} /></label>
              <label className="field"><span>電話（僅媒合成功後顯示）</span><input value={me.phone || ''} onChange={(e) => setMe({ ...me, phone: e.target.value })} /></label>
              <label className="field span2"><span>自我介紹</span><textarea value={me.bio || ''} onChange={(e) => setMe({ ...me, bio: e.target.value })} /></label>
              <div className="span2"><button className="btn ghost">儲存飼主資料</button></div>
            </form>
          </Card>
        </div>

        <Card className="pad">
          <SectionHead title={form.id ? `編輯 ${form.name}` : '建立新的毛孩檔案'} sub="這些資訊會用於 AI 媒合與自動勾選照護加給" />
          <form className="form-grid" onSubmit={save}>
            <label className="field"><span>名字 *</span><input required value={form.name} onChange={set('name')} placeholder="例如：布丁" /></label>
            <label className="field"><span>品種 *</span><input required value={form.breed || ''} onChange={set('breed')} placeholder="例如：柯基" /></label>
            {['type', 'sex', 'neuter', 'vaccine'].map((k) => <Select key={k} k={k} form={form} set={set} />)}
            <label className="field"><span>出生年月</span><input type="month" value={form.birth || ''} onChange={set('birth')} /></label>
            <label className="field"><span>體重（kg）</span><input type="number" step="0.1" value={form.weight ?? ''} onChange={set('weight')} /><small>≥ 20kg 會自動視為大型犬照護</small></label>
            {['energy', 'social', 'leash'].map((k) => <Select key={k} k={k} form={form} set={set} />)}
            <label className="field"><span>晶片末四碼</span><input maxLength={4} value={form.chip_last4 || ''} onChange={set('chip_last4')} /><small>只保存末四碼，不公開完整編號</small></label>
            <label className="field span2"><span>個性與習慣</span><textarea value={form.intro || ''} onChange={set('intro')} /></label>
            <label className="field span2"><span>醫療與禁忌</span><textarea value={form.medical || ''} onChange={set('medical')} placeholder="過敏、舊傷、用藥…" /></label>
            <label className="field"><span>緊急聯絡</span><input value={form.emergency || ''} onChange={set('emergency')} /></label>
            <label className="field"><span>常去醫院</span><input value={form.clinic || ''} onChange={set('clinic')} /></label>
            <label className="upload span2">
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              {photo ? <img src={URL.createObjectURL(photo)} alt="預覽" /> : form.photo_url ? <img src={assetUrl(form.photo_url)} alt={form.name} /> : <div style={{ fontSize: 30 }}>📷</div>}
              <div className="small strong mt-s">{photo ? photo.name : '上傳毛孩照片（選填）'}</div>
            </label>
            <div className="span2 row">
              <button className="btn primary">{form.id ? '更新檔案' : '新增並儲存'}</button>
              {form.id && <button type="button" className="btn danger" onClick={() => remove(form)}>刪除</button>}
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

const LABEL = { type: '類型', sex: '性別', neuter: '結紮', vaccine: '疫苗', energy: '活動量', social: '與其他動物互動', leash: '牽繩方式' };
function Select({ k, form, set }) {
  return <label className="field"><span>{LABEL[k]}</span><select value={form[k] || ''} onChange={set(k)}>{OPTS[k].map((o) => <option key={o}>{o}</option>)}</select></label>;
}
