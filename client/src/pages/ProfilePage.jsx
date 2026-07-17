import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { changePassword as changePasswordApi } from '../api/authApi';
import Button from '../components/Button';
import Input from '../components/Input';

function validateProfile({ name }) {
  const errors = {};
  if (!name.trim()) errors.name = 'El nombre es requerido';
  return errors;
}

function validatePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'La contraseña actual es requerida';
  if (newPassword.length < 6) {
    errors.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres';
  }
  if (confirmPassword !== newPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
  return errors;
}

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const errors = validateProfile(profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    try {
      await updateProfile(profileForm.name);
      toast.success('Perfil actualizado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const errors = validatePassword(passwordForm);
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    try {
      await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Contraseña actualizada');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Perfil</h1>

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-slate-700">Datos personales</h2>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            label="Nombre"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ name: e.target.value })}
            error={profileErrors.name}
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <span className="text-sm text-slate-500">{user?.email}</span>
          </div>
          <Button type="submit" disabled={savingProfile} className="self-start">
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </div>

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-slate-700">Cambiar contraseña</h2>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <Input
            id="currentPassword"
            label="Contraseña actual"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            error={passwordErrors.currentPassword}
          />
          <Input
            id="newPassword"
            label="Nueva contraseña"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            error={passwordErrors.newPassword}
          />
          <Input
            id="confirmPassword"
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            error={passwordErrors.confirmPassword}
          />
          <Button type="submit" disabled={savingPassword} className="self-start">
            {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
