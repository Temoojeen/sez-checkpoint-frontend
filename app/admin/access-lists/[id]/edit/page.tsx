"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import accessListService from "@/services/access-list.service";
import { AccessList, ApiError } from "@/types";
import styles from "./page.module.css";
import Header from "@/components/Header/Header";

export default function EditAccessListPage() {

  const params = useParams();
  const id = params.id as string;

  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessList, setAccessList] = useState<AccessList | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    priority: 1,
    isActive: true,
  });

  const presetColors = [
    { value: "#3b82f6", label: "Синий", icon: "ri-admin-line" },
    { value: "#10b981", label: "Зеленый", icon: "ri-user-line" },
    { value: "#f59e0b", label: "Оранжевый", icon: "ri-user-star-line" },
    { value: "#ef4444", label: "Красный", icon: "ri-shield-user-line" },
    { value: "#8b5cf6", label: "Фиолетовый", icon: "ri-vip-crown-line" },
    { value: "#ec4899", label: "Розовый", icon: "ri-heart-line" },
  ];

  // Проверка прав
  useEffect(() => {
    if (currentUser && currentUser.roleId !== 1) {
      router.push("/");
      toast.error("У вас нет доступа к этой странице");
    }
  }, [currentUser, router]);

  const fetchAccessListData = useCallback(async () => {
    try {
      setLoading(true);

      const listData = await accessListService.getById(id);
      setAccessList(listData);

      setFormData({
        name: listData.name || "",
        description: listData.description || "",
        color: listData.color || "#3b82f6",
        priority: listData.priority || 1,
        isActive: listData.isActive,
      });

    } catch (error: unknown) {

      console.error("Error fetching access list:", error);

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as ApiError;

        if (apiError.response?.status === 404) {
          toast.error("Список не найден");
          router.push("/admin/access-lists");
        } else {
          toast.error("Ошибка при загрузке данных");
        }

      } else {
        toast.error("Ошибка при загрузке данных");
      }

    } finally {
      setLoading(false);
    }

  }, [id, router]);

  useEffect(() => {
    if (currentUser?.roleId === 1) {
      fetchAccessListData();
    }
  }, [currentUser, fetchAccessListData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {

    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "priority"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!accessList) return;

    if (!formData.name.trim()) {
      toast.error("Введите название списка");
      return;
    }

    if (formData.name.length < 3) {
      toast.error("Название должно содержать минимум 3 символа");
      return;
    }

    try {

      setSaving(true);

      await accessListService.update(accessList.id, {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color || undefined,
        priority: formData.priority,
        isActive: formData.isActive,
      });

      toast.success("Список успешно обновлен");

      router.push(`/admin/access-lists/${id}`);

    } catch (error: unknown) {

      console.error("Error updating access list:", error);

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || "Ошибка при обновлении");
      } else {
        toast.error("Ошибка при обновлении");
      }

    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка данных списка...</p>
        </div>
      </div>
    );
  }

  if (!accessList) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Список не найден</h2>

        <Link href="/admin/access-lists" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>

      <Header role="admin" />

      <main className={styles.main}>

        <div className={styles.formCard}>

          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <i className="ri-list-check-3"></i>
              Редактировать список доступа
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>

            <div className={styles.formGroup}>
              <label htmlFor="name">
                Название списка <span className={styles.required}>*</span>
              </label>

              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите название списка"
                disabled={saving}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Описание</label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                rows={3}
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="color">Цвет</label>

              <div className={styles.presetColors}>
                {presetColors.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`${styles.presetColor} ${
                      formData.color === preset.value
                        ? styles.presetColorActive
                        : ""
                    }`}
                    style={{ backgroundColor: preset.value }}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        color: preset.value,
                      }))
                    }
                    disabled={saving}
                  >
                    <i className={preset.icon}></i>
                  </button>
                ))}
              </div>

              <div className={styles.colorInput}>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className={styles.colorPicker}
                  disabled={saving}
                />

                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className={styles.colorValue}
                  disabled={saving}
                />
              </div>
            </div>

            <div
              className={styles.previewBox}
              style={{ backgroundColor: `${formData.color}15` }}
            >
              <div
                className={styles.previewIcon}
                style={{ color: formData.color }}
              >
                <i className="ri-list-check-3"></i>
              </div>

              <div className={styles.previewContent}>
                <p
                  className={styles.previewTitle}
                  style={{ color: formData.color }}
                >
                  {formData.name || "Название списка"}
                </p>

                <p className={styles.previewDescription}>
                  {formData.description || "Описание списка"}
                </p>

                <div
                  className={styles.previewBadge}
                  style={{ backgroundColor: formData.color }}
                >
                  Приоритет: {formData.priority}
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <Link
                href={`/admin/access-lists/${id}`}
                className={styles.cancelButton}
              >
                Отмена
              </Link>

              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line ri-spin"></i>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    Сохранить изменения
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}