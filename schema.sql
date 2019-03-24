CREATE TABLE categories (
  id serial primary key,
  title character variying(255) not null unique
);

CREATE TABLE products (
  id serial primary key,
  title character varying(255) not null unique,
  price int not null,
  description text not null,
  image character varying(255),
  created timestamp with time zone default current_timestamp,
  category integer references categories(id)
);

CREATE TABLE users (
  userid serial primary key, 
  username varchar(128) not null unique,
  email varchar(128) not null unique,
  password character varying(255) NOT NULL,
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
  foreign key(productid) references products(id),
  foreign key(orderid) references orders(orderid)  
);
