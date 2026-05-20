import { useState } from "react";
import { useNavigate } from "react-router";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Shield, Eye, EyeOff, Users, Stethoscope } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, isLoginLoading, isRegisterLoading, loginError, registerError, user } = useCustomAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "coach" as "coach" | "medical",
  });
  const [validationError, setValidationError] = useState("");

  // Redirect if already logged in
  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (isRegister) {
      if (!formData.name || formData.name.length < 2) {
        setValidationError("Имя должно содержать минимум 2 символа");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setValidationError("Пароли не совпадают");
        return;
      }
      if (formData.password.length < 6) {
        setValidationError("Пароль должен содержать минимум 6 символов");
        return;
      }
      register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
    } else {
      if (!formData.email || !formData.password) {
        setValidationError("Заполните все поля");
        return;
      }
      login(formData.email, formData.password);
    }
  };

  const error = validationError || (loginError?.message ?? "") || (registerError?.message ?? "");

  return (
    <div className="min-h-screen bg-[#0c0d0e] flex items-center justify-center relative overflow-hidden">
      {/* Decorative blurred circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#96f7b9]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#c9f692]/5 rounded-full blur-[80px]" />

      <div className="relative w-full max-w-[400px] mx-4">
        {/* Card */}
        <div className="bg-[#191a1b] rounded-[10px] border border-[#2a2b2c] p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-[#96f7b9]/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-[#96f7b9]" />
            </div>
            <h1 className="text-white text-xl font-bold">FootballManager</h1>
            <p className="text-gray-500 text-sm mt-1">Управление футбольным клубом</p>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-[#11131a] rounded-lg p-1">
            <button
              onClick={() => { setIsRegister(false); setValidationError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors
                ${!isRegister ? "bg-[#2a2b2c] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Вход
            </button>
            <button
              onClick={() => { setIsRegister(true); setValidationError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors
                ${isRegister ? "bg-[#2a2b2c] text-white" : "text-gray-400 hover:text-white"}`}
            >
              Регистрация
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Имя</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-10 px-3 bg-[#11131a] border border-[#2a2b2c] rounded-md text-white text-sm focus:outline-none focus:border-[#96f7b9] focus:ring-1 focus:ring-[#96f7b9]/20 transition-colors"
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Роль</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: "coach" })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm transition-colors
                        ${formData.role === "coach"
                          ? "border-[#96f7b9] bg-[#96f7b9]/10 text-[#96f7b9]"
                          : "border-[#2a2b2c] text-gray-400 hover:text-white"}`}
                    >
                      <Users size={16} />
                      Тренер
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: "medical" })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm transition-colors
                        ${formData.role === "medical"
                          ? "border-[#96f7b9] bg-[#96f7b9]/10 text-[#96f7b9]"
                          : "border-[#2a2b2c] text-gray-400 hover:text-white"}`}
                    >
                      <Stethoscope size={16} />
                      Врач
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-10 px-3 bg-[#11131a] border border-[#2a2b2c] rounded-md text-white text-sm focus:outline-none focus:border-[#96f7b9] focus:ring-1 focus:ring-[#96f7b9]/20 transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-10 px-3 pr-10 bg-[#11131a] border border-[#2a2b2c] rounded-md text-white text-sm focus:outline-none focus:border-[#96f7b9] focus:ring-1 focus:ring-[#96f7b9]/20 transition-colors"
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full h-10 px-3 bg-[#11131a] border border-[#2a2b2c] rounded-md text-white text-sm focus:outline-none focus:border-[#96f7b9] focus:ring-1 focus:ring-[#96f7b9]/20 transition-colors"
                  placeholder="******"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoginLoading || isRegisterLoading}
              className="w-full h-10 bg-[#1f2937] hover:bg-[#374151] text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoginLoading || isRegisterLoading ? (
                "Загрузка..."
              ) : isRegister ? (
                "Зарегистрироваться"
              ) : (
                "Войти"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
