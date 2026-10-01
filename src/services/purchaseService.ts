import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { apiClient } from './api.ts';
import { PurchaseOrder, User, PurchaseTargetWallet, PaymentMethodConfig } from '../types/index.ts';

const ACTIVE_ORDER_KEY_PREFIX = 'angopayx_active_order_';

export interface CreatePurchaseParams {
  usdtAmount: number;
  paymentMethod: PaymentMethodConfig;
  targetWallet: PurchaseTargetWallet;
  user: User;
  buyRateKz: number;
}

export interface UploadReceiptParams {
  orderId: string;
  file?: File | null;
  receiptDataUrl?: string;
  user: User;
}

export const purchaseService = {
  /**
   * Save active order to local storage as resilient persistence layer
   */
  saveActiveOrderLocally(userId: string, order: PurchaseOrder) {
    try {
      localStorage.setItem(`${ACTIVE_ORDER_KEY_PREFIX}${userId}`, JSON.stringify(order));
    } catch (e) {
      console.warn('Aviso ao guardar ordem no armazenamento local:', e);
    }
  },

  /**
   * Retrieve active order from local storage
   */
  getActiveOrderLocally(userId: string): PurchaseOrder | null {
    try {
      const raw = localStorage.getItem(`${ACTIVE_ORDER_KEY_PREFIX}${userId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Clear active order from local storage
   */
  clearActiveOrderLocally(userId: string) {
    try {
      localStorage.removeItem(`${ACTIVE_ORDER_KEY_PREFIX}${userId}`);
    } catch (e) {
      console.warn('Aviso ao limpar ordem local:', e);
    }
  },

  /**
   * Create a purchase order directly in Supabase as real authoritative source
   */
  async createPurchase(params: CreatePurchaseParams): Promise<PurchaseOrder> {
    const { usdtAmount, paymentMethod, targetWallet, user, buyRateKz } = params;

    // Strict KYC verification check
    const isSoleAdmin = user.email?.toLowerCase() === 'luisbongue4@gmail.com';
    if (!isSoleAdmin && user.kycStatus !== 'Aprovado') {
      throw new Error('Validação de perfil necessária. Antes de solicitar depósitos ou recargas, preencha a sua Data de Nascimento e Número do BI no seu Perfil para validação do Administrador.');
    }

    const subtotalKz = usdtAmount * buyRateKz;
    const feeKz = 0;
    const totalKz = Math.round(subtotalKz + feeKz);

    let supabaseCreatedOrder: PurchaseOrder | null = null;
    let generatedId: string | null = null;

    // 1. Inserir a ordem no Supabase se configurado
    if (isSupabaseConfigured) {
      try {
        const orderPayload = {
          user_id: user.id,
          user_email: user.email,
          user_name: user.name || user.email.split('@')[0],
          usdt_amount: usdtAmount,
          buy_rate_kz: buyRateKz,
          subtotal_kz: subtotalKz,
          fee_kz: feeKz,
          total_kz: totalKz,
          payment_method_type: paymentMethod.id,
          payment_method_details: {
            title: paymentMethod.name,
            bank: paymentMethod.bank,
            beneficiary: paymentMethod.beneficiary,
            accountOrCode: paymentMethod.accountOrCode,
            instructions: paymentMethod.instructions,
          },
          target_wallet: targetWallet,
          status: 'Aguardando pagamento',
        };

        const { data, error } = await supabase
          .from('purchase_orders')
          .insert([orderPayload])
          .select()
          .single();

        if (error) {
          console.warn('[Supabase purchase_orders insert warning]:', error.message || error);
        } else if (data && data.id) {
          generatedId = data.id;
          supabaseCreatedOrder = {
            id: data.id,
            userId: data.user_id || user.id,
            userEmail: data.user_email || user.email,
            userName: data.user_name || user.name,
            usdtAmount: Number(data.usdt_amount),
            buyRateKz: Number(data.buy_rate_kz),
            subtotalKz: Number(data.subtotal_kz),
            feeKz: Number(data.fee_kz || 0),
            totalKz: Number(data.total_kz),
            paymentMethodType: data.payment_method_type,
            paymentMethodDetails: data.payment_method_details,
            targetWallet: data.target_wallet,
            status: data.status || 'Aguardando pagamento',
            createdAt: data.created_at || new Date().toISOString(),
          };
        }
      } catch (supaErr: any) {
        console.warn('Erro ao inserir purchase_order no Supabase:', supaErr?.message || supaErr);
      }
    }

    // 2. Sincronizar com o backend da aplicação
    let backendOrder: PurchaseOrder | null = null;
    try {
      const res = await apiClient.createPurchase({
        usdtAmount,
        paymentMethodType: paymentMethod.id as any,
        targetWallet,
        ...(generatedId ? { id: generatedId } : {}),
      } as any);
      if (res && res.order) {
        backendOrder = res.order;
      }
    } catch (backendErr: any) {
      console.warn('Aviso de sincronização da ordem no backend:', backendErr?.message || backendErr);
    }

    // 3. Definir a ordem oficial priorizando o ID real do Supabase
    const finalOrder: PurchaseOrder = supabaseCreatedOrder || backendOrder || {
      id: generatedId || `buy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      usdtAmount,
      buyRateKz,
      subtotalKz,
      feeKz,
      totalKz,
      paymentMethodType: paymentMethod.id as any,
      paymentMethodDetails: {
        title: paymentMethod.name,
        bank: paymentMethod.bank,
        beneficiary: paymentMethod.beneficiary,
        accountOrCode: paymentMethod.accountOrCode,
        instructions: paymentMethod.instructions,
      },
      targetWallet,
      status: 'Aguardando pagamento',
      createdAt: new Date().toISOString(),
    };

    // 4. Salvar no armazenamento local do navegador para persistência contínua
    this.saveActiveOrderLocally(user.id, finalOrder);

    return finalOrder;
  },

  /**
   * Upload payment receipt to Supabase Storage and update the order
   */
  async uploadReceipt(params: UploadReceiptParams): Promise<PurchaseOrder> {
    const { orderId, file, receiptDataUrl, user } = params;

    if (!orderId) {
      throw new Error('ID da ordem de compra inválido.');
    }

    const isSoleAdmin = user.email?.toLowerCase() === 'luisbongue4@gmail.com';
    if (!isSoleAdmin && user.kycStatus !== 'Aprovado') {
      throw new Error('Validação de perfil necessária. Antes de solicitar depósitos ou recargas, preencha a sua Data de Nascimento e Número do BI no seu Perfil para validação do Administrador.');
    }

    let uploadedReceiptUrl = receiptDataUrl || '';

    // 1. Upload do comprovativo para o Supabase Storage se um arquivo real for fornecido
    if (file && isSupabaseConfigured) {
      // Validação estrita do arquivo
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('O ficheiro do comprovativo excede o tamanho máximo permitido de 5 MB.');
      }

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!validMimeTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension || '')) {
        throw new Error('Formato de comprovativo não suportado. Por favor utilize JPG, PNG ou PDF.');
      }

      // Caminho único e seguro no Supabase Storage:
      // purchase-proofs/{user_id}/{order_id}/{timestamp}-{clean_filename}
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageFilePath = `${user.id}/${orderId}/${Date.now()}-${cleanFileName}`;
      const bucketName = 'purchase-proofs';

      try {
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storageFilePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.warn(`[Supabase Storage] Aviso no bucket "${bucketName}":`, uploadError.message);
          // Tentar fallback para kyc-documents se o bucket purchase-proofs ainda não tiver sido criado
          const fallbackBucket = 'kyc-documents';
          const { error: fallbackError } = await supabase.storage
            .from(fallbackBucket)
            .upload(`proofs/${storageFilePath}`, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (!fallbackError) {
            const { data: publicUrlData } = supabase.storage
              .from(fallbackBucket)
              .getPublicUrl(`proofs/${storageFilePath}`);
            if (publicUrlData?.publicUrl) {
              uploadedReceiptUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn('[Supabase Storage] Fallback também falhou, usando dados do comprovativo em base64:', fallbackError.message);
          }
        } else {
          // Obter URL pública do arquivo enviado
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(storageFilePath);

          if (publicUrlData?.publicUrl) {
            uploadedReceiptUrl = publicUrlData.publicUrl;
          }
        }
      } catch (storageException: any) {
        console.warn('Exceção ao enviar ficheiro para o Supabase Storage:', storageException?.message || storageException);
      }
    }

    if (!uploadedReceiptUrl) {
      throw new Error('Por favor selecione um comprovativo válido em formato JPG, PNG ou PDF.');
    }

    const submittedAt = new Date().toISOString();
    let updatedSupabaseOrder: PurchaseOrder | null = null;

    // 2. Atualizar a ordem de compra no Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .update({
            receipt_url: uploadedReceiptUrl,
            receipt_submitted_at: submittedAt,
            status: 'Comprovativo enviado',
            updated_at: submittedAt,
          })
          .eq('id', orderId)
          .select()
          .single();

        if (error) {
          console.warn('[Supabase purchase_orders update warning]:', {
            orderId,
            userId: user.id,
            error: error.message || error,
          });
        } else if (data) {
          updatedSupabaseOrder = {
            id: data.id,
            userId: data.user_id || user.id,
            userEmail: data.user_email || user.email,
            userName: data.user_name || user.name,
            usdtAmount: Number(data.usdt_amount),
            buyRateKz: Number(data.buy_rate_kz),
            subtotalKz: Number(data.subtotal_kz),
            feeKz: Number(data.fee_kz || 0),
            totalKz: Number(data.total_kz),
            paymentMethodType: data.payment_method_type,
            paymentMethodDetails: data.payment_method_details,
            targetWallet: data.target_wallet,
            receiptUrl: data.receipt_url,
            receiptSubmittedAt: data.receipt_submitted_at,
            status: data.status || 'Comprovativo enviado',
            createdAt: data.created_at,
          };
        }
      } catch (supaErr: any) {
        console.warn('Erro ao atualizar purchase_order no Supabase:', supaErr?.message || supaErr);
      }
    }

    // 3. Atualizar no backend AngoPayX
    let backendUpdatedOrder: PurchaseOrder | null = null;
    try {
      const res = await apiClient.uploadPurchaseReceipt({
        orderId,
        receiptUrl: uploadedReceiptUrl,
      });
      if (res && res.order) {
        backendUpdatedOrder = res.order;
      }
    } catch (backendErr: any) {
      console.warn('Aviso ao sincronizar comprovativo com o backend:', backendErr?.message || backendErr);
    }

    // 4. Montar a ordem atualizada final
    const finalUpdatedOrder: PurchaseOrder =
      updatedSupabaseOrder ||
      backendUpdatedOrder ||
      (() => {
        const current = this.getActiveOrderLocally(user.id);
        return {
          ...(current || ({} as any)),
          id: orderId,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          receiptUrl: uploadedReceiptUrl,
          receiptSubmittedAt: submittedAt,
          status: 'Comprovativo enviado',
        } as PurchaseOrder;
      })();

    // 5. Atualizar armazenamento local
    this.saveActiveOrderLocally(user.id, finalUpdatedOrder);

    return finalUpdatedOrder;
  },

  /**
   * Load user's purchase orders merging Supabase and backend
   */
  async loadUserOrders(user: User): Promise<PurchaseOrder[]> {
    const ordersMap = new Map<string, PurchaseOrder>();

    // 1. Carregar do Supabase se configurado
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          for (const item of data) {
            ordersMap.set(item.id, {
              id: item.id,
              userId: item.user_id,
              userEmail: item.user_email,
              userName: item.user_name || '',
              usdtAmount: Number(item.usdt_amount),
              buyRateKz: Number(item.buy_rate_kz),
              subtotalKz: Number(item.subtotal_kz),
              feeKz: Number(item.fee_kz || 0),
              totalKz: Number(item.total_kz),
              paymentMethodType: item.payment_method_type,
              paymentMethodDetails: item.payment_method_details,
              targetWallet: item.target_wallet,
              receiptUrl: item.receipt_url,
              receiptSubmittedAt: item.receipt_submitted_at,
              status: item.status,
              createdAt: item.created_at,
            });
          }
        }
      } catch (supaErr: any) {
        console.warn('Aviso ao carregar compras do Supabase:', supaErr?.message || supaErr);
      }
    }

    // 2. Carregar do backend local
    try {
      const res = await apiClient.getMyPurchases();
      if (res && Array.isArray(res.purchases)) {
        for (const item of res.purchases) {
          if (!ordersMap.has(item.id)) {
            ordersMap.set(item.id, item);
          } else {
            // Manter a versão com status mais avançado ou dados do comprovativo
            const existing = ordersMap.get(item.id)!;
            if (item.receiptUrl && !existing.receiptUrl) {
              ordersMap.set(item.id, { ...existing, ...item });
            }
          }
        }
      }
    } catch (backendErr: any) {
      console.warn('Aviso ao carregar compras da API local:', backendErr?.message || backendErr);
    }

    // 3. Verificar ordem ativa salva localmente
    const localActive = this.getActiveOrderLocally(user.id);
    if (localActive && !ordersMap.has(localActive.id)) {
      ordersMap.set(localActive.id, localActive);
    }

    return Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
};
