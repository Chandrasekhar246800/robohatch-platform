import { prisma } from '../config/prisma';

export class CartService {
  // Helper function to transform product structure to match frontend expectations
  private transformProduct(product: any) {
    if (!product) return product;
    
    return {
      ...product,
      category: product.categories?.[0]?.category || null,
      images: product.images || [],
    };
  }

  // Helper function to transform cart items
  private transformCartItems(items: any[]) {
    return items.map(item => ({
      ...item,
      product: this.transformProduct(item.product),
    }));
  }

  // Get user's cart with all items (optimized for performance)
  async getUserCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                isActive: true,
                stock: true,
                images: {
                  select: {
                    url: true,
                    alt: true,
                  },
                  take: 1, // Only get first image for performance
                },
                categories: {
                  select: {
                    category: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
            customDesign: {
              select: {
                id: true,
                name: true,
                description: true,
                estimatedPrice: true,
                material: true,
                color: true,
                fileUrl: true,
                status: true,
                modelWeightGrams: true,
                totalWeightGrams: true,
                infillPercentage: true,
                extruderCount: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  isActive: true,
                  stock: true,
                  images: {
                    select: {
                      url: true,
                      alt: true,
                    },
                    take: 1,
                  },
                  categories: {
                    select: {
                      category: {
                        select: {
                          id: true,
                          name: true,
                          slug: true,
                          description: true,
                        },
                      },
                    },
                  },
                },
              },
              customDesign: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  estimatedPrice: true,
                  material: true,
                  color: true,
                  fileUrl: true,
                  status: true,
                  modelWeightGrams: true,
                  totalWeightGrams: true,
                  infillPercentage: true,
                  extruderCount: true,
                },
              },
            },
          },
        },
      });
    }

    // Transform cart items to match frontend structure
    const transformedCart = {
      ...cart,
      items: this.transformCartItems(cart.items),
    };

    return transformedCart;
  }

  // Add item to cart or update quantity if exists (optimized)
  async addToCart(userId: string, productId: string, quantity: number = 1, customText?: string, customImageUrl?: string) {
    // Verify product exists - only check necessary fields
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is not available');
    }

    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        select: { id: true },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId,
      },
      select: { id: true, quantity: true },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity and custom fields - return minimal data for performance
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: existingItem.quantity + quantity,
          customText: customText || undefined,
          customImageUrl: customImageUrl || undefined,
        },
        select: {
          id: true,
          quantity: true,
          productId: true,
          cartId: true,
          customText: true,
          customImageUrl: true,
        },
      });
    } else {
      // Create new cart item - return minimal data for performance
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          customText: customText || undefined,
          customImageUrl: customImageUrl || undefined,
        },
        select: {
          id: true,
          quantity: true,
          productId: true,
          cartId: true,
          customText: true,
          customImageUrl: true,
        },
      });
    }

    return cartItem;
  }

  // Add custom design to cart
  async addCustomDesignToCart(userId: string, customDesignId: string, quantity: number = 1) {
    // Verify custom design exists and belongs to user
    const customDesign = await prisma.customDesign.findUnique({
      where: { id: customDesignId },
      select: { id: true, userId: true, estimatedPrice: true },
    });

    if (!customDesign) {
      throw new Error('Custom design not found');
    }

    if(customDesign.userId !== userId) {
      throw new Error('Unauthorized: This design belongs to another user');
    }

    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        select: { id: true },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        customDesignId,
      },
      select: { id: true, quantity: true },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: existingItem.quantity + quantity,
        },
        select: {
          id: true,
          quantity: true,
          customDesignId: true,
          cartId: true,
        },
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          customDesignId,
          quantity,
        },
        select: {
          id: true,
          quantity: true,
          customDesignId: true,
          cartId: true,
        },
      });
    }

    return cartItem;
  }

  // Update cart item quantity (optimized)
  async updateCartItem(userId: string, itemId: string, quantity: number) {
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Verify item belongs to user - only select needed fields
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        cart: {
          select: { userId: true },
        },
      },
    });

    if (!item || item.cart.userId !== userId) {
      throw new Error('Cart item not found');
    }

    return await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      select: {
        id: true,
        quantity: true,
        productId: true,
        cartId: true,
      },
    });
  }

  // Remove item from cart (optimized)
  async removeFromCart(userId: string, itemId: string) {
    // Verify item belongs to user - only select needed fields
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        cart: {
          select: { userId: true },
        },
      },
    });

    if (!item || item.cart.userId !== userId) {
      throw new Error('Cart item not found');
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return { message: 'Item removed from cart' };
  }

  // Clear entire cart
  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: 'Cart cleared' };
  }

  // Get cart summary (total items and price)
  async getCartSummary(userId: string) {
    const cart = await this.getUserCart(userId);

    const totalItems = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce(
      (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
      0
    );

    return {
      totalItems,
      totalPrice,
      itemCount: cart.items.length,
    };
  }
}
