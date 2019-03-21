CREATE TABLE categories (
  categoryid serial primary key,
  title varchar(128) not null unique
);

CREATE TABLE products (
  productid serial primary key,
  categoryid int not null,
  title varchar(128) not null unique,
  price int not null,
  description text not null,
  image varchar(128),
  created timestamp with time zone default current_timestamp,
  foreign key(categoryid) references categories(categoryid)
);

CREATE TABLE users (
  userid serial primary key, 
  username varchar(128) not null unique,
  password varchar(128) not null,
  admin boolean default false
);

CREATE TABLE orders (
  orderid serial primary key,
  userid int not null,
  ordered boolean default false,
  name varchar(128),
  address varchar(128), 
  created timestamp with time zone default current_timestamp,
  foreign key(userid) references users(userid)
);

CREATE TABLE cart_products (
  cartproductsid serial primary key,
  orderid int not null,
  productid int not null,
  amount int,
  foreign key(productid) references products(productid),
  foreign key(orderid) references orders(orderid)  
);
